import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sprout, ShoppingCart, LogOut, User, Bell, Menu, X } from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { supabase } from "../lib/supabase";
import SearchUsers from "./SearchUsers";
import { WalletService } from "../services/wallet.service";

// Simple error boundary component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="p-4 text-red-600">Error: {error.message}</div>
);

interface NavbarProps {
  isAuthenticated?: boolean;
}

const Navbar: React.FC<NavbarProps> = React.memo(({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userType, setUserType] = useState<"farmer" | "buyer" | null>(null);
  const [notifications, setNotifications] = useState(0); // Changed to 0 as default
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [ethBalance, setEthBalance] = useState<string>("0");

  const setupUserData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const [farmerData, buyerData] = await Promise.all([
        supabase.from("farmers").select("profile_photo_url").eq("user_id", user.id).single(),
        supabase.from("buyers").select("profile_photo_url").eq("user_id", user.id).single(),
      ]);

      if (farmerData.data) {
        setProfilePhoto(farmerData.data.profile_photo_url);
        setUserType("farmer");
      } else if (buyerData.data) {
        setProfilePhoto(buyerData.data.profile_photo_url);
        setUserType("buyer");
      }

      // Setup real-time subscriptions
      const farmerSubscription = supabase
        .channel("farmer-profile-changes")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "farmers", filter: `user_id=eq.${user.id}` },
          (payload) => setProfilePhoto(payload.new.profile_photo_url)
        )
        .subscribe();

      const buyerSubscription = supabase
        .channel("buyer-profile-changes")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "buyers", filter: `user_id=eq.${user.id}` },
          (payload) => setProfilePhoto(payload.new.profile_photo_url)
        )
        .subscribe();

      setIsLoading(false);
      return () => {
        supabase.removeChannel(farmerSubscription);
        supabase.removeChannel(buyerSubscription);
      };
    } catch (err) {
      console.error("Setup user data failed:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadEthBalance = useCallback(async () => {
    if (!address) return;
    try {
      const { balance } = await WalletService.getWalletBalance(address, "onchain");
      setEthBalance(balance);
    } catch (error) {
      console.error("ETH balance load failed:", error);
    }
  }, [address]);

  useEffect(() => {
    if (isAuthenticated) {
      setupUserData();
      loadEthBalance();
    }
  }, [isAuthenticated, setupUserData, loadEthBalance]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || location.pathname.includes("/login") || location.pathname.includes("/register")) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
      setError(err instanceof Error ? err : new Error("Logout failed"));
    } finally {
      setShowProfileMenu(false);
    }
  };

  if (error) return <ErrorFallback error={error} />;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center flex-1">
            <Link to="/" className="flex items-center" aria-label="Home">
              <Sprout className="h-7 w-7 text-emerald-600" />
              <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900">FarmConnect</span>
            </Link>
            {!isLoading && (
              <div className="hidden md:block ml-6 flex-1 max-w-md">
                <SearchUsers />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/marketplace"
              className="text-gray-600 hover:text-emerald-600 flex items-center"
              aria-label="Marketplace"
            >
              <ShoppingCart className="h-6 w-6" />
              <span className="ml-1 hidden md:inline text-base">Marketplace</span>
            </Link>

            <button className="text-gray-600 hover:text-emerald-600 relative" aria-label="Notifications">
              <Bell className="h-6 w-6" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center text-gray-700 hover:text-emerald-600"
                aria-label="Profile menu"
                aria-expanded={showProfileMenu}
              >
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                  {isLoading ? (
                    <div className="animate-pulse bg-emerald-200 h-full w-full" />
                  ) : profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = ""; // Fallback to default if image fails
                        setProfilePhoto(null);
                      }}
                    />
                  ) : (
                    <User className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4 inline mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {address && (
              <div className="hidden md:flex items-center space-x-2">
                <div className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-md font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <div className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                  {parseFloat(ethBalance).toFixed(4)} ETH
                </div>
              </div>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden bg-emerald-50 rounded-md p-2"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-emerald-600" /> : <Menu className="h-6 w-6 text-emerald-600" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-3 px-6 bg-white border-t">
            {!isLoading && (
              <div className="mb-3">
                <SearchUsers />
              </div>
            )}
            <Link
              to="/marketplace"
              className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 mb-1 rounded-md"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Marketplace"
            >
              <ShoppingCart className="h-4 w-4 inline mr-2" />
              Marketplace
            </Link>
            {address && (
              <div className="mt-2 flex flex-col space-y-2">
                <div className="px-3 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <div className="px-3 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                  {parseFloat(ethBalance).toFixed(4)} ETH
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;