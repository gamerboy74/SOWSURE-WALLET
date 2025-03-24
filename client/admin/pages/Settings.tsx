import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SiteSettings {
  site_name: string;
  support_email: string;
  max_file_size: number;
  allow_registration: boolean;
  require_email_verification: boolean;
  maintenance_mode: boolean;
  contact_phone: string;
  contact_address: string;
  social_links: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
  };
  commission_rate: number;
  min_withdrawal: number;
  max_withdrawal: number;
}

interface PlatformStats {
  active_listings: number;
  registered_farmers: number;
  daily_transactions: number;
  verified_buyers: number;
}

function Settings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [adminProfile, setAdminProfile] = useState<{ profile_photo_url?: string } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    loadAdminProfile();
    loadPlatformStats();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(data);
      } else {
        setSettings({
          site_name: '',
          support_email: '',
          max_file_size: 0,
          allow_registration: false,
          require_email_verification: false,
          maintenance_mode: false,
          contact_phone: '',
          contact_address: '',
          social_links: { facebook: '', twitter: '', instagram: '', linkedin: '' },
          commission_rate: 0,
          min_withdrawal: 0,
          max_withdrawal: 0,
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('admin_users')
        .select('profile_photo_url')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setAdminProfile(data || { profile_photo_url: '' });
    } catch (err) {
      console.error('Error loading admin profile:', err);
      setError('Failed to load admin profile');
    }
  };

  const loadPlatformStats = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_stats')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setPlatformStats(data);
      } else {
        setPlatformStats({
          active_listings: 0,
          registered_farmers: 0,
          daily_transactions: 0,
          verified_buyers: 0,
        });
      }
    } catch (err) {
      console.error('Error loading platform stats:', err);
      setError('Failed to load platform stats');
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;

    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error('User not authenticated');

      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-profile-photos')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('admin-profile-photos')
        .getPublicUrl(fileName);

      const publicUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ profile_photo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAdminProfile({ profile_photo_url: publicUrl });
      setPhotoFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadAdminProfile();
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !platformStats) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: settingsError } = await supabase
        .from('site_settings')
        .upsert([settings], { onConflict: 'id' });

      if (settingsError) throw settingsError;

      const { error: statsError } = await supabase
        .from('platform_stats')
        .upsert([{ id: 1, ...platformStats }], { onConflict: 'id' });

      if (statsError) throw statsError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings or stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings or stats');
    } finally {
      setLoading(false);
    }
  };

  if (!settings || !adminProfile || !platformStats) {
    return (
      <div className="p-6 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-lg">
          Settings and stats saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Admin Profile Photo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Profile</h2>
          <div className="flex items-center space-x-4">
            {adminProfile.profile_photo_url ? (
              <img
                src={adminProfile.profile_photo_url}
                alt="Admin Profile"
                className="w-24 h-24 rounded-full object-cover"
                onError={(e) => (e.currentTarget.src = '/fallback-image.png')}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                No Photo
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              {photoFile && (
                <button
                  type="button"
                  onClick={handlePhotoUpload}
                  disabled={loading}
                  className="mt-2 flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Site Name</label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input
                type="text"
                value={settings.contact_phone}
                onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Maximum File Size (MB)</label>
              <input
                type="number"
                value={settings.max_file_size}
                onChange={(e) => setSettings({ ...settings, max_file_size: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Contact Address</label>
            <textarea
              value={settings.contact_address}
              onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Facebook URL</label>
              <input
                type="url"
                value={settings.social_links.facebook}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, facebook: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Twitter URL</label>
              <input
                type="url"
                value={settings.social_links.twitter}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, twitter: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Instagram URL</label>
              <input
                type="url"
                value={settings.social_links.instagram}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, instagram: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
              <input
                type="url"
                value={settings.social_links.linkedin}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, linkedin: e.target.value },
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.commission_rate}
                onChange={(e) => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Minimum Withdrawal (₹)</label>
              <input
                type="number"
                min="0"
                value={settings.min_withdrawal}
                onChange={(e) => setSettings({ ...settings, min_withdrawal: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Maximum Withdrawal (₹)</label>
              <input
                type="number"
                min="0"
                value={settings.max_withdrawal}
                onChange={(e) => setSettings({ ...settings, max_withdrawal: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowRegistration"
                checked={settings.allow_registration}
                onChange={(e) => setSettings({ ...settings, allow_registration: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="allowRegistration" className="ml-2 block text-sm text-gray-900">
                Allow New Registrations
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireEmailVerification"
                checked={settings.require_email_verification}
                onChange={(e) => setSettings({ ...settings, require_email_verification: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="requireEmailVerification" className="ml-2 block text-sm text-gray-900">
                Require Email Verification
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              />
              <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-900">
                Maintenance Mode
              </label>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Active Listings</label>
              <input
                type="number"
                min="0"
                value={platformStats.active_listings}
                onChange={(e) =>
                  setPlatformStats({ ...platformStats, active_listings: parseInt(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registered Farmers</label>
              <input
                type="number"
                min="0"
                value={platformStats.registered_farmers}
                onChange={(e) =>
                  setPlatformStats({ ...platformStats, registered_farmers: parseInt(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Daily Transactions (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={platformStats.daily_transactions}
                onChange={(e) =>
                  setPlatformStats({ ...platformStats, daily_transactions: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Verified Buyers</label>
              <input
                type="number"
                min="0"
                value={platformStats.verified_buyers}
                onChange={(e) =>
                  setPlatformStats({ ...platformStats, verified_buyers: parseInt(e.target.value) || 0 })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Settings;