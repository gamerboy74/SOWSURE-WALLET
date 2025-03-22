import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Images,
  Star,
  BarChart2,
  Bell,
  Settings,
  Wallet
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Farmers', path: '/admin/farmers' },
  { icon: Users, label: 'Buyers', path: '/admin/buyers' },
  { icon: Images, label: 'Image Sliders', path: '/admin/sliders' },
  { icon: Star, label: 'Featured Listings', path: '/admin/featured' },
  { icon: Wallet, label: 'Wallet Requests', path: '/admin/wallet/requests' },
  { icon: BarChart2, label: 'Analytics', path: '/admin/analytics' },
  { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' }
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-30">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Admin Dashboard v1.0
          </div>
        </div>
      </div>
    </aside>
  );
}