import React, { useState, useEffect } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
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

function Settings() {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'FarmConnect',
    support_email: 'support@farmconnect.com',
    max_file_size: 10,
    allow_registration: true,
    require_email_verification: false,
    maintenance_mode: false,
    contact_phone: '+91 123 456 7890',
    contact_address: '123 Agriculture Road, Farming District, New Delhi, 110001',
    social_links: {
      facebook: 'https://facebook.com/farmconnect',
      twitter: 'https://twitter.com/farmconnect',
      instagram: 'https://instagram.com/farmconnect',
      linkedin: 'https://linkedin.com/company/farmconnect'
    },
    commission_rate: 2.5,
    min_withdrawal: 1000,
    max_withdrawal: 100000
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      // Don't show error on initial load if settings don't exist yet
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert([settings], {
          onConflict: 'id'
        });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

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
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Site Name
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Support Email
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Phone
              </label>
              <input
                type="text"
                value={settings.contact_phone}
                onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum File Size (MB)
              </label>
              <input
                type="number"
                value={settings.max_file_size}
                onChange={(e) => setSettings({ ...settings, max_file_size: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Contact Address
            </label>
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
              <label className="block text-sm font-medium text-gray-700">
                Facebook URL
              </label>
              <input
                type="url"
                value={settings.social_links.facebook}
                onChange={(e) => setSettings({
                  ...settings,
                  social_links: { ...settings.social_links, facebook: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Twitter URL
              </label>
              <input
                type="url"
                value={settings.social_links.twitter}
                onChange={(e) => setSettings({
                  ...settings,
                  social_links: { ...settings.social_links, twitter: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Instagram URL
              </label>
              <input
                type="url"
                value={settings.social_links.instagram}
                onChange={(e) => setSettings({
                  ...settings,
                  social_links: { ...settings.social_links, instagram: e.target.value }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={settings.social_links.linkedin}
                onChange={(e) => setSettings({
                  ...settings,
                  social_links: { ...settings.social_links, linkedin: e.target.value }
                })}
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
              <label className="block text-sm font-medium text-gray-700">
                Commission Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.commission_rate}
                onChange={(e) => setSettings({ ...settings, commission_rate: parseFloat(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Minimum Withdrawal (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.min_withdrawal}
                onChange={(e) => setSettings({ ...settings, min_withdrawal: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maximum Withdrawal (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.max_withdrawal}
                onChange={(e) => setSettings({ ...settings, max_withdrawal: parseInt(e.target.value) })}
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