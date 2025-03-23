import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import {
  Save,
  Loader2,
  AlertCircle,
  User,
  Bell,
  Lock,
  Shield,
  Upload,
  Edit2,
} from "lucide-react";
import LoadingSpinner from "../../../src/components/shared/LoadingSpinner";

interface ProfileFormData {
  name: string;
  email: string;
  phone_number: string;
  address?: string;
  entity_name?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
}

interface SecurityFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface PrivacySettings {
  profile_visibility: "public" | "private" | "verified";
  show_contact_info: boolean;
  show_activity_status: boolean;
}

interface UserProfile {
  user_type: "farmer" | "buyer" | null;
  profile: any;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    user_type: null,
    profile: null,
  });
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
    });
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profile_visibility: "public",
    show_contact_info: true,
    show_activity_status: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({ mode: "onChange" });

  const {
    register: registerSecurity,
    handleSubmit: handleSecuritySubmit,
    reset: resetSecurity,
    formState: { errors: securityErrors },
  } = useForm<SecurityFormData>({ mode: "onChange" });

  useEffect(() => {
    loadUserProfile();
  }, [navigate, resetProfile]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) return navigate("/");

      const [farmerResult, buyerResult] = await Promise.all([
        supabase
          .from("farmers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("buyers")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const profileData = farmerResult.data || buyerResult.data;
      const userType = farmerResult.data ? "farmer" : "buyer";

      if (!profileData) throw new Error("No profile found");

      setUserProfile({ user_type: userType, profile: profileData });
      setImagePreview(profileData.profile_photo_url);
      resetProfile({
        name: profileData.name || profileData.contact_name,
        email: profileData.email,
        phone_number: profileData.phone_number,
        address: profileData.complete_address || profileData.business_address,
        entity_name: profileData.farm_name || profileData.company_name,
      });

      const { data: notificationData } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id);

      if (notificationData) {
        setNotificationSettings({
          email_notifications: notificationData.some(
            (n) => n.type === "system"
          ),
          push_notifications: notificationData.some((n) => n.type === "alert"),
          sms_notifications: notificationData.some((n) => n.type === "message"),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setError("Image size must be less than 5MB");
    }
  };

  const onProfileSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("No access token");

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
      let profilePhotoUrl = userProfile.profile?.profile_photo_url;
      const bucket =
        userProfile.user_type === "farmer"
          ? "farmer-documents"
          : "buyer-documents";

      if (selectedImage && userProfile.profile?.user_id) {
        // Remove old photo if it exists and isn't a blob URL
        if (profilePhotoUrl && !profilePhotoUrl.startsWith("blob:")) {
          const oldPath = profilePhotoUrl.split(
            `/storage/v1/object/public/${bucket}/`
          )[1];
          if (oldPath) {
            await fetch(
              `${SUPABASE_URL}/storage/v1/object/${bucket}/${oldPath}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
          }
        }

        // Upload new photo using fetch
        const formData = new FormData();
        const fileExt = selectedImage.name.split(".").pop();
        const fileName = `${
          userProfile.profile.user_id
        }-${Date.now()}.${fileExt}`;
        const filePath = `profile-photos/${fileName}`;
        formData.append("file", selectedImage, fileName);

        const uploadResponse = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        profilePhotoUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
      }

      const updateData = {
        email: data.email,
        phone_number: data.phone_number,
        profile_photo_url: profilePhotoUrl,
        updated_at: new Date().toISOString(),
        ...(userProfile.user_type === "farmer"
          ? { name: data.name, complete_address: data.address }
          : {
              contact_name: data.name,
              business_address: data.address,
              company_name: data.entity_name,
            }),
      };

      const { error } = await supabase
        .from(userProfile.user_type === "farmer" ? "farmers" : "buyers")
        .update(updateData)
        .eq("user_id", userProfile.profile.user_id);

      if (error) throw error;

      if (data.email !== userProfile.profile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (authError) throw authError;
      }

      setSuccess(true);
      setIsEditing(false);
      setUserProfile((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...updateData },
      }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const onSecuritySubmit: SubmitHandler<SecurityFormData> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      if (data.new_password !== data.confirm_password) {
        throw new Error("New passwords do not match");
      }

      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });

      if (error) throw error;

      setSuccess(true);
      setIsEditing(false);
      resetSecurity();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (
    type: keyof NotificationSettings,
    value: boolean
  ) => {
    setNotificationSettings((prev) => ({ ...prev, [type]: value }));
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("notifications").upsert({
          user_id: user.id,
          title: "Notification Preference Updated",
          message: `Updated ${type} to ${value}`,
          type: "system",
        });
      }
    } catch (err) {
      console.error("Failed to save notification preference:", err);
    }
  };

  const handlePrivacyChange = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setPrivacySettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <LoadingSpinner text="Loading settings..." fullScreen />;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-lg">
            Settings saved successfully!
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: "profile", icon: User, label: "Profile" },
            { id: "notifications", icon: Bell, label: "Notifications" },
            { id: "security", icon: Lock, label: "Security" },
            { id: "privacy", icon: Shield, label: "Privacy" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsEditing(false);
              }}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === "profile" && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Profile Settings
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>

              <form
                onSubmit={handleProfileSubmit(onProfileSubmit)}
                className="space-y-6"
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Photo
                    </label>
                    <div className="flex items-center space-x-4">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      {isEditing && (
                        <label className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                            disabled={!isEditing}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { id: "name", label: "Name", required: true },
                      {
                        id: "email",
                        label: "Email",
                        required: true,
                        disabled: true,
                      },
                      {
                        id: "phone_number",
                        label: "Phone Number",
                        required: true,
                        pattern: /^[0-9]{10}$/,
                      },
                      {
                        id: "address",
                        label:
                          userProfile.user_type === "farmer"
                            ? "Address"
                            : "Business Address",
                        required: true,
                      },
                      ...(userProfile.user_type === "buyer"
                        ? [
                            {
                              id: "entity_name",
                              label: "Company Name",
                              required: true,
                            },
                          ]
                        : []),
                    ].map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <input
                          {...registerProfile(
                            field.id as keyof ProfileFormData,
                            {
                              required:
                                field.required && `${field.label} is required`,
                              ...(field.pattern && {
                                pattern: {
                                  value: field.pattern,
                                  message: `Invalid ${field.label.toLowerCase()}`,
                                },
                              }),
                            }
                          )}
                          disabled={!isEditing || field.disabled}
                          className={`w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
                            profileErrors[field.id as keyof ProfileFormData]
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                        {profileErrors[field.id as keyof ProfileFormData] && (
                          <p className="text-red-500 text-sm mt-1">
                            {
                              profileErrors[field.id as keyof ProfileFormData]
                                ?.message
                            }
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        resetProfile();
                        setImagePreview(userProfile.profile?.profile_photo_url);
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Notification Preferences
              </h2>
              <div className="space-y-6">
                {[
                  {
                    key: "email_notifications",
                    label: "Email Notifications",
                    desc: "Receive updates via email",
                  },
                  {
                    key: "push_notifications",
                    label: "Push Notifications",
                    desc: "Receive notifications in browser",
                  },
                  {
                    key: "sms_notifications",
                    label: "SMS Notifications",
                    desc: "Receive updates via SMS",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          notificationSettings[
                            item.key as keyof NotificationSettings
                          ]
                        }
                        onChange={(e) =>
                          handleNotificationChange(
                            item.key as keyof NotificationSettings,
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <form
              onSubmit={handleSecuritySubmit(onSecuritySubmit)}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Security Settings
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center px-3 py-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {[
                  { id: "current_password", label: "Current Password" },
                  { id: "new_password", label: "New Password", minLength: 8 },
                  { id: "confirm_password", label: "Confirm New Password" },
                ].map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="password"
                      {...registerSecurity(field.id as keyof SecurityFormData, {
                        required: `${field.label} is required`,
                        ...(field.minLength && {
                          minLength: {
                            value: field.minLength,
                            message: "Minimum 8 characters",
                          },
                        }),
                      })}
                      disabled={!isEditing}
                      className={`w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        securityErrors[field.id as keyof SecurityFormData]
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    {securityErrors[field.id as keyof SecurityFormData] && (
                      <p className="text-red-500 text-sm mt-1">
                        {
                          securityErrors[field.id as keyof SecurityFormData]
                            ?.message
                        }
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      resetSecurity();
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          )}

          {activeTab === "privacy" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Privacy Settings
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Profile Visibility
                    </h3>
                    <p className="text-sm text-gray-500">
                      Control who can see your profile
                    </p>
                  </div>
                  <select
                    value={privacySettings.profile_visibility}
                    onChange={(e) =>
                      handlePrivacyChange(
                        "profile_visibility",
                        e.target.value as "public" | "private" | "verified"
                      )
                    }
                    className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                    <option value="verified">Verified Users Only</option>
                  </select>
                </div>
                {[
                  {
                    key: "show_contact_info",
                    label: "Contact Information",
                    desc: "Show contact info to other users",
                  },
                  {
                    key: "show_activity_status",
                    label: "Activity Status",
                    desc: "Show when you're online",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.label}
                      </h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          privacySettings[item.key as keyof PrivacySettings]
                        }
                        onChange={(e) =>
                          handlePrivacyChange(
                            item.key as keyof PrivacySettings,
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
