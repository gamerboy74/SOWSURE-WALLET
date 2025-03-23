import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Farmer } from "../types/types";
import {
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
      <div className="text-indigo-600">{icon}</div>
    </div>
  </div>
);

function FarmerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Farmer | null>(null);
  const [stats, setStats] = useState<DashboardStats>({});

  useEffect(() => {
    async function loadProfile() {
      try {
        console.log("Fetching user from Supabase...");
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          console.error("Auth error:", authError.message);
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        if (!user) {
          console.log("No user found, redirecting...");
          navigate("/");
          return;
        }

        console.log("User found:", user.id);
        const { data: farmerData, error: farmerError } = await supabase
          .from("farmers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (farmerError) {
          console.error("Farmer query error:", farmerError.message);
          throw new Error(`Farmer query failed: ${farmerError.message}`);
        }
        if (!farmerData) {
          console.log("No farmer profile found for user:", user.id);
          throw new Error("Profile not found");
        }

        console.log("Farmer data:", farmerData);
        setProfile(farmerData);

        // Attempt to fetch stats, but don't fail the whole profile load if it doesn't exist
        try {
          const { data: productsData, error: statsError } = await supabase
            .from("products")
            .select("count")
            .eq("farmer_id", farmerData.id);

          if (statsError) {
            console.warn("Stats fetch warning:", statsError.message);
            // Set default stats if products table doesn't exist
            setStats({
              totalProducts: 0,
              activeListings: 0,
              totalSales: 0,
            });
          } else {
            console.log("Products data:", productsData);
            setStats({
              totalProducts: productsData?.[0]?.count || 0,
              activeListings: 0,
              totalSales: 0,
            });
          }
        } catch (statsErr) {
          console.warn("Stats fetch failed, using defaults:", statsErr);
          setStats({
            totalProducts: 0,
            activeListings: 0,
            totalSales: 0,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load profile";
        console.error("Error in loadProfile:", errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
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
      totalProducts: stats.totalProducts || 0,
      activeListings: stats.activeListings || 0,
      totalSales: `₹${stats.totalSales || 0}`,
    }),
    [stats]
  );

  const profileDisplay = useMemo(
    () => ({
      displayName: profile?.name || "Unknown",
      walletDisplay: profile?.wallet_address
        ? `${profile.wallet_address.slice(0, 6)}...${profile.wallet_address.slice(-4)}`
        : "Not connected",
    }),
    [profile]
  );

  if (loading) {
    return <LoadingSpinner text="Loading your farmer profile..." fullScreen />;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error || "Profile not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200"
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
                className="bg-red-100 text-red-600 py-2 px-4 rounded-md hover:bg-red-200 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Products"
              value={dashboardStats.totalProducts}
              icon={<Package className="h-10 w-10" />}
            />
            <StatCard
              title="Active Listings"
              value={dashboardStats.activeListings}
              icon={<Package className="h-10 w-10" />}
            />
            <StatCard
              title="Total Sales"
              value={dashboardStats.totalSales}
              icon={<Sprout className="h-10 w-10" />}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium text-gray-900">
                      {profileDisplay.displayName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">
                      {profile.complete_address || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Sprout className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Land Size</p>
                    <p className="font-medium text-gray-900">
                      {profile.land_size ? `${profile.land_size} acres` : "Not set"}
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