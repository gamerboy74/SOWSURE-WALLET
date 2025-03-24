import React, { useState, useEffect } from 'react';
import { Bell, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

function AdminHeader() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ profile_photo_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch admin profile data on component mount
  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        setLoading(true);
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
        setAdminProfile({ profile_photo_url: '' }); // Fallback to empty state
      } finally {
        setLoading(false);
      }
    };

    loadAdminProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  return (
    <header className="bg-white shadow-sm h-16 fixed top-0 right-0 left-64 z-10">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative text-gray-600 hover:text-gray-900">
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              3
            </span>
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              ) : adminProfile?.profile_photo_url ? (
                <img
                  src={adminProfile.profile_photo_url}
                  alt="Admin Profile"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    console.error('Image load error:', e);
                    e.currentTarget.src = '/fallback-image.png'; // Optional fallback image
                  }}
                />
              ) : (
                <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-600 font-medium">
                    {adminProfile ? 'AU' : '?'}
                  </span>
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">Admin User</span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;