import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Sprout, ShoppingCart, Bell, Menu, X } from "lucide-react";
import { useWallet } from "../../hooks/useWallet";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../../src/context/AuthContext";
import { useNotification } from "../../../src/context/NotificationContext";
import SearchUsers from "./SearchUsers";
import ProfileMenu from "./ProfileMenu";
import MobileMenu from "./MobileMenu";

interface NavbarProps {
  isAuthenticated?: boolean;
}

const Navbar: React.FC<NavbarProps> = React.memo(
  ({ isAuthenticated = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { address, balance } = useWallet();
    const { user, loading: authLoading } = useAuth();
    const notification = useNotification();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [siteName, setSiteName] = useState("FarmConnect"); // Default site name

    const setupUserData = useCallback(async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const [farmerData, buyerData] = await Promise.all([
          supabase
            .from("farmers")
            .select("profile_photo_url")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("buyers")
            .select("profile_photo_url")
            .eq("user_id", user.id)
            .single(),
        ]);

        setProfilePhoto(
          farmerData.data?.profile_photo_url ||
            buyerData.data?.profile_photo_url ||
            null
        );
      } catch (error) {
        console.error("Setup user data failed:", error);
      } finally {
        setIsLoading(false);
      }
    }, [isAuthenticated, user]);

    // Fetch site name from site_settings table
    const fetchSiteName = useCallback(async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("site_name")
          .single();
        if (error) throw error;
        if (data && data.site_name) {
          setSiteName(data.site_name);
        }
      } catch (err) {
        console.error("Failed to fetch site name:", err);
      }
    }, []);

    // Fetch unread notifications count from notification_counts
    const fetchUnreadNotifications = useCallback(async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("notification_counts")
          .select("unread_count")
          .eq("user_id", user.id)
          .single();
        if (error && error.code !== "PGRST116") throw error; // Ignore "no rows" error
        setUnreadNotifications(data?.unread_count || 0);
      } catch (err) {
        console.error("Failed to fetch unread notifications count:", err);
      }
    }, [user]);

    useEffect(() => {
      if (isAuthenticated && !authLoading) {
        setupUserData();
        fetchSiteName();
        fetchUnreadNotifications();
      }
    }, [isAuthenticated, authLoading, setupUserData, fetchSiteName, fetchUnreadNotifications]);

    // Real-time subscription for notification counts
    useEffect(() => {
      if (!user) return;

      const channel = supabase
        .channel("notification_counts_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notification_counts",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadNotifications();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }, [user, fetchUnreadNotifications]);

    // Auth state change listener
    useEffect(() => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          notification.info("You have been signed out");
          setUnreadNotifications(0); // Reset notifications on sign out
          setSiteName("FarmConnect"); // Reset site name on sign out
        }
      });

      return () => subscription.unsubscribe();
    }, [notification]);

    if (
      !isAuthenticated ||
      authLoading ||
      location.pathname.includes("/login") ||
      location.pathname.includes("/register")
    ) {
      return null;
    }

    const handleLogout = async () => {
      try {
        await supabase.auth.signOut();
        navigate("/");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    };

    const handleConnect = async () => {
      try {
        // ...connection logic...
        notification.success("Wallet connected successfully");
      } catch (err) {
        notification.error("Failed to connect wallet");
      }
    };

    // Handle notification bell click
    const handleNotificationsClick = () => {
      navigate("/notifications");
    };

    return (
      <nav
        className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md shadow-md"
        aria-label="Main navigation"
      >
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link
                to="/"
                className="flex items-center hover:opacity-80 transition-opacity"
                aria-label="Home"
              >
                <Sprout className="h-8 w-8 text-emerald-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {siteName}
                </span>
              </Link>
              {!isLoading && (
                <div className="hidden md:flex items-center space-x-4">
                  <Link
                    to="/"
                    className="text-gray-600 hover:text-emerald-600 flex items-center transition-colors"
                    aria-label="Home"
                  >
                    <Sprout className="h-5 w-5 mr-1" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/marketplace"
                    className="text-gray-600 hover:text-emerald-600 flex items-center transition-colors"
                    aria-label="Marketplace"
                  >
                    <ShoppingCart className="h-5 w-5 mr-1" />
                    <span>Marketplace</span>
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {!isLoading && (
                <div className="hidden md:block">
                  <SearchUsers excludeUserId={user?.id} />
                </div>
              )}
              <button
                onClick={handleNotificationsClick}
                className="relative text-gray-600 hover:text-emerald-600 p-2 rounded-full hover:bg-gray-100"
                aria-label="View Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <ProfileMenu
                onLogout={handleLogout}
                profilePhoto={profilePhoto}
                isLoading={isLoading}
              />
              {address && (
                <div className="hidden md:flex items-center space-x-2">
                  <div className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                  <div className="px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg">
                    {parseFloat(balance.eth).toFixed(4)} ETH
                  </div>
                </div>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Menu className="h-6 w-6 text-emerald-600" />
                )}
              </button>
            </div>
          </div>
          <MobileMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            userId={user?.id}
            address={address || undefined}
            balance={balance}
          />
        </div>
      </nav>
    );
  }
);

Navbar.displayName = "Navbar";
export default Navbar;