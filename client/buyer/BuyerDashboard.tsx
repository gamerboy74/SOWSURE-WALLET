import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
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
  Upload,
} from "lucide-react";
import LoadingSpinner from "../../src/components/shared/LoadingSpinner";

interface DashboardStats {
  totalTransactions?: number;
  activeListings?: number;
  totalPurchases?: number;
}

interface FormData {
  contact_name: string;
  phone_number: string;
  storage_capacity: number;
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
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      contact_name: "",
      phone_number: "",
      storage_capacity: 0,
    },
  });

  useEffect(() => {
    async function loadProfileAndStats() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError)
          throw new Error(`Authentication failed: ${authError.message}`);
        if (!user) {
          navigate("/");
          return;
        }

        const { data: buyerData, error: buyerError } = await supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (buyerError)
          throw new Error(`Buyer query failed: ${buyerError.message}`);
        if (!buyerData) throw new Error("Profile not found");

        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("wallet_address")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletError)
          throw new Error(`Wallet query failed: ${walletError.message}`);

        setProfile({
          ...buyerData,
          wallet_address: walletData?.wallet_address || null,
        });

        const { count, error: listingsError } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("type", "sell")
          .eq("status", "active");

        if (listingsError)
          throw new Error(
            `Failed to fetch active listings: ${listingsError.message}`
          );

        setStats({
          totalTransactions: 0,
          activeListings: count || 0,
          totalPurchases: 0,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load profile";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndStats();
  }, [navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      setError("Failed to logout");
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    reset({
      contact_name: profile?.contact_name || "",
      phone_number: profile?.phone_number || "",
      storage_capacity: profile?.storage_capacity || 0,
    });
    setImagePreview(profile?.profile_photo_url || null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowConfirm(false);
    setSelectedImage(null);
    setImagePreview(null);
    reset();
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setShowConfirm(true);
    // Update profile without setting profile_photo_url yet
    setProfile((prev) => ({
      ...prev!,
      contact_name: data.contact_name,
      phone_number: data.phone_number,
      storage_capacity: data.storage_capacity,
    }));
  };

  const confirmSave = async () => {
    try {
      setLoading(true);
      let profilePhotoUrl = profile?.profile_photo_url; // Keep the old URL until new one is confirmed

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError)
        throw new Error(`Failed to get session: ${sessionError.message}`);
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("No access token available");

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

      if (selectedImage && profile?.user_id) {
        // Step 1: Delete the old profile photo if it exists and isn’t a blob URL
        if (
          profile?.profile_photo_url &&
          !profile.profile_photo_url.startsWith("blob:")
        ) {
          try {
            console.log(
              "Original profile photo URL:",
              profile.profile_photo_url
            );
            const urlPath = profile.profile_photo_url.split(
              "/storage/v1/object/public/buyer-documents/"
            )[1];
            if (!urlPath) {
              console.warn(
                "Could not extract path from URL:",
                profile.profile_photo_url
              );
            } else {
              const oldFilePath = urlPath;
              const deleteUrl = `${SUPABASE_URL}/storage/v1/object/buyer-documents/${oldFilePath}`;
              console.log("Attempting to delete:", deleteUrl);

              const deleteResponse = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });

              const responseText = await deleteResponse.text();
              if (!deleteResponse.ok) {
                console.warn(
                  "Delete failed with status:",
                  deleteResponse.status
                );
                console.warn("Response text:", responseText);
                if (deleteResponse.status !== 404) {
                  throw new Error(`Failed to delete: ${responseText}`);
                } else {
                  console.log("Old file not found, proceeding with upload...");
                }
              } else {
                console.log(`Successfully deleted: ${oldFilePath}`);
              }
            }
          } catch (error) {
            console.error("Delete operation error:", error);
            // Continue even if delete fails
          }
        }

        // Step 2: Upload the new profile photo
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/buyer-documents/${filePath}`;

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": selectedImage.type,
            "x-upsert": "true",
          },
          body: selectedImage,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(
            `Image upload failed: ${uploadResponse.statusText} - ${errorText}`
          );
        }

        // Set the new profilePhotoUrl only after successful upload
        profilePhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/buyer-documents/${filePath}`;
      }

      // Step 3: Update the buyer profile in the database
      const { error } = await supabase
        .from("buyers")
        .update({
          contact_name: profile?.contact_name,
          phone_number: profile?.phone_number,
          storage_capacity: profile?.storage_capacity,
          profile_photo_url: profilePhotoUrl,
        })
        .eq("user_id", profile?.user_id);

      if (error) throw new Error(`Update failed: ${error.message}`);

      // Step 4: Update local state with the new profile data
      setProfile((prev) => ({
        ...prev!,
        profile_photo_url: profilePhotoUrl,
      }));
      setIsEditing(false);
      setShowConfirm(false);
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <LoadingSpinner
          text="Loading your buyer profile..."
          fullScreen
          className="animate-fade-in"
        />
      </div>
    );
  }

  if (error && !isEditing) {
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
                  <p className="text-emerald-100">
                    Welcome back, {profileInfo.displayName}
                  </p>
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Profile Information
              </h2>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-all duration-300"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg animate-fade-in">
                {error}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Image Upload */}
                <div className="mb-6 flex justify-center">
                  <div className="relative">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile Preview"
                        className="h-24 w-24 rounded-full object-cover border-4 border-emerald-500"
                      />
                    ) : profile?.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt="Profile"
                        className="h-24 w-24 rounded-full object-cover border-4 border-emerald-500"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-500">
                        <User className="h-12 w-12 text-emerald-600" />
                      </div>
                    )}
                    <label
                      htmlFor="profile-image"
                      className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-all duration-300"
                    >
                      <Upload className="h-4 w-4 text-white" />
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Company
                      </label>
                      <input
                        type="text"
                        value={profile?.company_name || ""}
                        disabled
                        className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0"
                      />
                    </div>
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Contact Person
                      </label>
                      <input
                        {...register("contact_name", {
                          required: "Contact name is required",
                          minLength: {
                            value: 2,
                            message: "Minimum 2 characters required",
                          },
                        })}
                        className={`w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                          errors.contact_name
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.contact_name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.contact_name.message}
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Storage Capacity (tons)
                      </label>
                      <input
                        type="number"
                        {...register("storage_capacity", {
                          required: "Storage capacity is required",
                          min: {
                            value: 0,
                            message: "Capacity must be positive",
                          },
                        })}
                        className={`w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                          errors.storage_capacity
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.storage_capacity && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.storage_capacity.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Phone
                      </label>
                      <input
                        {...register("phone_number", {
                          required: "Phone number is required",
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message:
                              "Invalid phone number (10 digits required)",
                          },
                        })}
                        className={`w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 ${
                          errors.phone_number
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.phone_number && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.phone_number.message}
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile?.email || ""}
                        disabled
                        className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0"
                      />
                    </div>
                    <div className="relative">
                      <label className="text-sm text-gray-600 font-medium">
                        Wallet
                      </label>
                      <input
                        type="text"
                        value={profileInfo.walletDisplay}
                        disabled
                        className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-emerald-600 text-white py-2 px-6 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all duration-300"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Building className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Company
                      </p>
                      <p className="font-semibold text-gray-900">
                        {profileInfo.companyDetails.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Contact Person
                      </p>
                      <p className="font-semibold text-gray-900">
                        {profileInfo.displayName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Warehouse className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Storage Capacity
                      </p>
                      <p className="font-semibold text-gray-900">
                        {profileInfo.companyDetails.capacity}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Phone</p>
                      <p className="font-semibold text-gray-900">
                        {profile?.phone_number || "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Email</p>
                      <p className="font-semibold text-gray-900">
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Wallet className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Wallet
                      </p>
                      <p className="font-semibold text-gray-900">
                        {profileInfo.walletDisplay}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center transition-opacity duration-300">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Changes
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to save these changes?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={loading}
                className="bg-emerald-600 text-white py-2 px-6 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all duration-300"
              >
                {loading ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuyerDashboard;
