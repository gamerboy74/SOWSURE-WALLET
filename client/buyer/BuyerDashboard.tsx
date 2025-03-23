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

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
      <div className="text-emerald-600">{icon}</div>
    </div>
  </div>
);

function BuyerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Buyer | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});

  useEffect(() => {
    async function loadProfileAndStats() {
      try {
        console.log("Fetching user from Supabase...");
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError)
          throw new Error(`Authentication failed: ${authError.message}`);
        if (!user) {
          console.log("No user found, redirecting...");
          navigate("/");
          return;
        }

        console.log("User found:", user.id);
        const { data: buyerData, error: buyerError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (buyerError)
          throw new Error(`Buyer query failed: ${buyerError.message}`);
        if (!buyerData) throw new Error("Profile not found");

        console.log("Buyer data:", buyerData);
        setProfile(buyerData);

        // Fetch active listings (products for sale by farmers)
        const { count, error: listingsError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true }) // Use count: "exact" to get the total count
          .eq("type", "sell")
          .eq("status", "active");

        if (listingsError) {
          console.error("Active listings error:", listingsError.message);
          throw new Error(
            `Failed to fetch active listings: ${listingsError.message}`
          );
        }

        // Since transactions table doesn't exist, set these to 0 for now
        setStats({
          totalTransactions: 0, // Placeholder until transactions table is added
          activeListings: count || 0,
          totalPurchases: 0, // Placeholder until transactions table is added
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load profile";
        console.error("Error in loadProfileAndStats:", errorMessage, error);
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
        ? `${profile.wallet_address.slice(
            0,
            6
          )}...${profile.wallet_address.slice(-4)}`
        : "Not connected",
    }),
    [profile]
  );

  if (loading) {
    return <LoadingSpinner text="Loading your buyer profile..." fullScreen />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors duration-200"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                {profile.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-emerald-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Buyer Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Welcome back, {profileInfo.displayName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-100 text-red-600 py-2 px-4 rounded-md hover:bg-red-200 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>

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

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium text-gray-900">
                      {profileInfo.companyDetails.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium text-gray-900">
                      {profileInfo.displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Warehouse className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Storage Capacity</p>
                    <p className="font-medium text-gray-900">
                      {profileInfo.companyDetails.capacity}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">
                      {profile.phone_number || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Wallet</p>
                    <p className="font-medium text-gray-900">
                      {profileInfo.walletDisplay}
                    </p>
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
