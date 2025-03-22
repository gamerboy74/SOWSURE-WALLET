import React, { useState } from "react";
import {
  Save,
  Loader2,
  AlertCircle,
  User,
  Bell,
  Lock,
  Shield,
} from "lucide-react";
import LoadingSpinner from "../../../src/components/shared/LoadingSpinner";

function Settings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Implement settings update logic
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

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

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "profile"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <User className="h-5 w-5 inline-block mr-2" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "notifications"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Bell className="h-5 w-5 inline-block mr-2" />
          Notifications
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "security"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Lock className="h-5 w-5 inline-block mr-2" />
          Security
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`px-4 py-2 rounded-md ${
            activeTab === "privacy"
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Shield className="h-5 w-5 inline-block mr-2" />
          Privacy
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "profile" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Profile Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile Photo
                </label>
                <div className="mt-1 flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Change Photo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notification Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Email Notifications
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive updates via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Push Notifications
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive notifications in browser
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    SMS Notifications
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receive updates via SMS
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Security Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Two-Factor Authentication
                </h3>
                <button
                  type="button"
                  className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-md hover:bg-emerald-50"
                >
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Privacy Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Profile Visibility
                  </h3>
                  <p className="text-sm text-gray-500">
                    Control who can see your profile
                  </p>
                </div>
                <select className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                  <option>Public</option>
                  <option>Private</option>
                  <option>Verified Users Only</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Contact Information
                  </h3>
                  <p className="text-sm text-gray-500">
                    Show contact info to other users
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Activity Status
                  </h3>
                  <p className="text-sm text-gray-500">
                    Show when you're online
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner text="Saving..." immediate fullScreen={false} />
              </span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
