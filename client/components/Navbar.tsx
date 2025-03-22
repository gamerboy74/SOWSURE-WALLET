import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Sprout,
  Wallet,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  Coins,
  ShoppingCart,
} from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { supabase } from "../lib/supabase";
import SearchUsers from "./SearchUsers";
import type { Wallet as WalletType } from "../types/types";
import { WalletService } from "../services/wallet.service";

// Simple debounce utility
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface NavbarProps {
  isAuthenticated?: boolean;
}

function Navbar({ isAuthenticated = false }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, balance } = useWallet(); // Remove connect/disconnect
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userType, setUserType] = useState<"farmer" | "buyer" | null>(null);
  const [notifications, setNotifications] = useState(3);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [ethBalance, setEthBalance] = useState<string>("0");

  console.log("Navbar rendered, isAuthenticated:", isAuthenticated);

  const fetchProfilePhoto = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data: farmerData } = await supabase
        .from("farmers")
        .select("profile_photo_url")
        .eq("user_id", user.id)
        .single();

      if (farmerData) {
        setProfilePhoto(farmerData.profile_photo_url);
        setUserType("farmer");
        setLoading(false);
        return;
      }

      const { data: buyerData } = await supabase
        .from("buyers")
        .select("profile_photo_url")
        .eq("user_id", user.id)
        .single();

      if (buyerData) {
        setProfilePhoto(buyerData.profile_photo_url);
        setUserType("buyer");
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet } = await supabase
        .from("wallets")
        .select("token_balance")
        .eq("user_id", user.id)
        .single();

      if (wallet) {
        setWalletBalance(wallet.token_balance);
      }
    } catch (err) {
      console.error("Error fetching wallet balance:", err);
    }
  };

  const debouncedFetchProfilePhoto = debounce(fetchProfilePhoto, 500);

  useEffect(() => {
    if (isAuthenticated) {
      const init = async () => {
        try {
          await fetchProfilePhoto();
          await fetchWalletBalance();
        } catch (error) {
          console.error("Error initializing navbar:", error);
        }
      };
      init();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletBalance();
      if (address) {
        loadEthBalance();
      }
    }
  }, [isAuthenticated, address]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  const loadEthBalance = async () => {
    try {
      const { balance } = await WalletService.getWalletBalance(
        address!,
        "onchain"
      );
      setEthBalance(balance);
    } catch (error) {
      console.error("Error loading ETH balance:", error);
    }
  };

  if (
    !isAuthenticated ||
    location.pathname.includes("/login") ||
    location.pathname.includes("/register")
  ) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setShowProfileMenu(false);
      window.location.href = "/"; // Force page refresh
    } catch (err) {
      console.error("Error during logout:", err);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center flex-1">
              <Link to="/" className="flex items-center">
                <Sprout className="h-8 w-8 text-emerald-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  FarmConnect
                </span>
              </Link>

              {isAuthenticated && (
                <div className="hidden md:block ml-6 flex-1">
                  <SearchUsers />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                    <Coins className="h-4 w-4 mr-1 text-yellow-500" />
                    <span>{balance.token.toLocaleString()} USDT</span>
                  </div>

                  {/* Marketplace Link */}
                  <Link
                    to="/marketplace"
                    className="text-gray-600 hover:text-emerald-600 flex items-center"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    <span className="ml-1 hidden md:inline">Marketplace</span>
                  </Link>

                  <div className="relative">
                    <button className="text-gray-600 hover:text-emerald-600">
                      <Bell className="h-6 w-6" />
                      {notifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {notifications}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-emerald-600"
                    >
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                        {loading ? (
                          <div className="animate-pulse bg-emerald-200 h-full w-full" />
                        ) : profilePhoto ? (
                          <img
                            src={profilePhoto}
                            alt="Profile"
                            className="h-full w-full object-cover"
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
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>

                  {address && (
                    <div className="hidden md:flex items-center space-x-2">
                      <div className="px-4 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                        <span className="font-mono">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                      </div>
                      <div className="px-4 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                        {parseFloat(ethBalance).toFixed(4)} ETH
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/farmer/login"
                    className="text-emerald-600 hover:text-emerald-700 px-3 py-2 text-sm font-medium"
                  >
                    Farmer Login
                  </Link>
                  <Link
                    to="/buyer/login"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Buyer Login
                  </Link>
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden bg-emerald-50 rounded-md p-2"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Menu className="h-6 w-6 text-emerald-600" />
                )}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 px-4 sm:px-6 lg:px-8">
              {isAuthenticated && (
                <>
                  <div className="mb-4">
                    <SearchUsers />
                  </div>
                  <Link
                    to="/marketplace"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5 inline mr-2" />
                    Marketplace
                  </Link>
                </>
              )}
              {address && (
                <div className="mt-4 flex items-center px-4 py-2 text-sm text-emerald-700 bg-emerald-50 rounded-md">
                  <Wallet className="h-4 w-4 mr-2" />
                  <span>
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
