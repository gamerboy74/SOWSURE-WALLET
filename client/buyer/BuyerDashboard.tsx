import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Buyer } from "../types/types";
import {
  ShoppingBag,
  Package,
  Warehouse,
  Wallet,
  Phone,
  Mail,
  Building,
  User,
} from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

interface DashboardStats {
  totalTransactions?: number;
  activeListings?: number;
  totalPurchases?: number;
}

interface ExtendedBuyer extends Buyer {
  wallet_address: string | null;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
      <div className="text-emerald-500 transform transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>
    </div>
  </div>
);

function BuyerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExtendedBuyer | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});

  useEffect(() => {
    async function loadProfileAndStats() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw new Error(`Authentication failed: ${authError.message}`);
        if (!user) {
          navigate("/");
          return;
        }

        const { data: buyerData, error: buyerError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (buyerError) throw new Error(`Buyer query failed: ${buyerError.message}`);
        if (!buyerData) throw new Error("Profile not found");

        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("wallet_address")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletError) throw new Error(`Wallet query failed: ${walletError.message}`);

        setProfile({
          ...buyerData,
          wallet_address: walletData?.wallet_address || null,
        });

        const { count, error: listingsError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("type", "sell")
          .eq("status", "active");

        if (listingsError) throw new Error(`Failed to fetch active listings: ${listingsError.message}`);

        setStats({
          totalTransactions: 0,
          activeListings: count || 0,
          totalPurchases: 0,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load profile";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndStats();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      setError("Failed to logout");
    }
  };

  const dashboardStats = useMemo(
    () => ({
      totalTransactions: stats.totalTransactions || 0,
      activeListings: stats.activeListings || 0,
      totalSpent: `₹${stats.totalPurchases || 0}`,
    }),
    [stats]
  );

  const profileInfo = useMemo(
    () => ({
      displayName: profile?.contact_name || "Unknown",
      companyDetails: {
        name: profile?.company_name || "Not set",
        capacity: `${profile?.storage_capacity || 0} tons`,
      },
      walletDisplay: profile?.wallet_address
        ? `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`
        : "Not connected",
    }),
    [profile]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner text="Loading your buyer profile..." fullScreen className="animate-fade-in" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-all duration-300"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {profile?.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-sm"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-sm">
                    <User className="h-8 w-8 text-emerald-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
                  <p className="text-emerald-100">Welcome back, {profileInfo.displayName}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Purchases"
              value={dashboardStats.totalTransactions}
              icon={<ShoppingBag className="h-10 w-10" />}
            />
            <StatCard
              title="Active Listings"
              value={dashboardStats.activeListings}
              icon={<Package className="h-10 w-10" />}
            />
            <StatCard
              title="Total Spent"
              value={dashboardStats.totalSpent}
              icon={<Warehouse className="h-10 w-10" />}
            />
          </div>

          {/* Profile Information Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg animate-fade-in">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Company</p>
                    <p className="font-semibold text-gray-900">{profileInfo.companyDetails.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Contact Person</p>
                    <p className="font-semibold text-gray-900">{profileInfo.displayName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Warehouse className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Storage Capacity</p>
                    <p className="font-semibold text-gray-900">{profileInfo.companyDetails.capacity}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Phone</p>
                    <p className="font-semibold text-gray-900">{profile?.phone_number || "Not set"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Email</p>
                    <p className="font-semibold text-gray-900">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Wallet</p>
                    <p className="font-semibold text-gray-900">{profileInfo.walletDisplay}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuyerDashboard;