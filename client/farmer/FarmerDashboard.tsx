import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Farmer } from "../types/types";
import {
  Loader2,
  Sprout,
  Package,
  MapPin,
  Wallet,
  Phone,
  Mail,
  User,
} from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

interface DashboardStats {
  totalProducts?: number;
  activeListings?: number;
  totalSales?: number;
}

function FarmerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Farmer | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});
  const [isFetchingStats, setIsFetchingStats] = useState(false);

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

        const { data: farmerData, error: farmerError } = await supabase
          .from("farmers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (farmerData && !farmerError) {
          setProfile(farmerData);
          // Fetch farmer-specific stats here
          setIsFetchingStats(true);
          const { data: productsData } = await supabase
            .from("products")
            .select("count")
            .eq("farmer_id", farmerData.id);

          setStats({
            totalProducts: productsData?.[0]?.count || 0,
            activeListings: 0, // You can add this table/column later
            totalSales: 0, // You can add this table/column later
          });
          setIsFetchingStats(false);
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
      totalProducts: stats.totalProducts || 0,
      activeListings: stats.activeListings || 0,
      totalSales: stats.totalSales || 0,
    }),
    [stats]
  );

  // Memoize profile display data
  const profileDisplay = useMemo(
    () => ({
      displayName: profile?.name || "Unknown",
      walletDisplay: profile?.wallet_address
        ? `${profile.wallet_address.slice(
            0,
            6
          )}...${profile.wallet_address.slice(-4)}`
        : "Not connected",
    }),
    [profile]
  );

  // Remove isFetchingStats spinner
  if (loading) {
    return (
      <LoadingSpinner
        text="Loading your farmer profile..."
        fullScreen
        immediate
      />
    );
  }

  // Remove this spinner
  // if (isFetchingStats) {
  //   return <LoadingSpinner text="Loading dashboard stats..." fullScreen={false} immediate />;
  // }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
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
                  <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-indigo-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Farmer Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Welcome back, {profileDisplay.displayName}
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
                  <p className="text-gray-500">Total Products</p>
                  <h3 className="text-2xl font-bold">
                    {dashboardStats.totalProducts}
                  </h3>
                </div>
                <Package className="h-10 w-10 text-indigo-600" />
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
                <Package className="h-10 w-10 text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Sales</p>
                  <h3 className="text-2xl font-bold">
                    {dashboardStats.totalSales}
                  </h3>
                </div>
                <Sprout className="h-10 w-10 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{profile.complete_address}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Sprout className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Land Size</p>
                    <p className="font-medium">{profile.land_size} acres</p>
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
                      {profileDisplay.walletDisplay}
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

export default FarmerDashboard;
