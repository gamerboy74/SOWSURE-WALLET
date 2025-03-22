import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Buyer } from "../types/types";
import {
  Loader2,
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

function BuyerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Buyer | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});

  useEffect(() => {
    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/");
          return;
        }

        const { data: buyerData, error: buyerError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (buyerData && !buyerError) {
          setProfile(buyerData);
          // Fetch buyer-specific stats here
          const { data: transactionsData } = await supabase
            .from("transactions")
            .select("count")
            .eq("buyer_id", buyerData.id);

          setStats({
            totalTransactions: transactionsData?.[0]?.count || 0,
            activeListings: 0, // Available products to purchase
            totalPurchases: 0, // Total amount spent
          });
          setLoading(false);
          return;
        }

        throw new Error("Profile not found");
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load profile"
        );
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Memoize stats calculations
  const dashboardStats = useMemo(
    () => ({
      totalTransactions: stats.totalTransactions || 0,
      activeListings: stats.activeListings || 0,
      totalSpent: `₹${stats.totalPurchases || 0}`,
    }),
    [stats]
  );

  // Memoize profile info
  const profileInfo = useMemo(
    () => ({
      displayName: profile?.contact_name || "Unknown",
      companyDetails: {
        name: profile?.company_name,
        business: profile?.business_name,
        capacity: `${profile?.storage_capacity} tons`,
      },
    }),
    [profile]
  );

  if (loading) {
    return (
      <LoadingSpinner
        text="Loading your buyer profile..."
        fullScreen
        immediate
      />
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700"
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
        <div className="grid gap-8">
          {/* Header Section */}
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
                    Welcome back, {profile.contact_name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-100 text-red-600 py-2 px-4 rounded-md hover:bg-red-200"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Purchases</p>
                  <h3 className="text-2xl font-bold">
                    {dashboardStats.totalTransactions}
                  </h3>
                </div>
                <ShoppingBag className="h-10 w-10 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Active Listings</p>
                  <h3 className="text-2xl font-bold">
                    {dashboardStats.activeListings}
                  </h3>
                </div>
                <Package className="h-10 w-10 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Spent</p>
                  <h3 className="text-2xl font-bold">
                    {dashboardStats.totalSpent}
                  </h3>
                </div>
                <Warehouse className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium">
                      {profileInfo.companyDetails.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Contact Person</p>
                    <p className="font-medium">{profileInfo.displayName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Warehouse className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Storage Capacity</p>
                    <p className="font-medium">
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
                    <p className="font-medium">{profile.phone_number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Wallet</p>
                    <p className="font-medium">
                      {profile.wallet_address
                        ? `${profile.wallet_address.slice(
                            0,
                            6
                          )}...${profile.wallet_address.slice(-4)}`
                        : "Not connected"}
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
