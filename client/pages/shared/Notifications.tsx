import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  ShoppingBag, 
  AlertCircle, 
  Info,
  Check,
  Loader2,
  Filter,
  Search,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'order' | 'message' | 'payment' | 'alert';
  read: boolean;
  created_at: string;
  read_at: string | null;
  data: Record<string, any>;
}

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true, read_at: new Date().toISOString() }
          : notification
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleAction = (notification: Notification) => {
    if (notification.data?.action === 'explore_marketplace') {
      navigate('/marketplace');
    }
    // Add more action handlers as needed
    markAsRead(notification.id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'system':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'order':
        return <ShoppingBag className="h-5 w-5 text-emerald-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case 'payment':
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || notification.type === filter;
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-md ${
              filter === 'unread'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search notifications..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="system">System</option>
            <option value="order">Orders</option>
            <option value="message">Messages</option>
            <option value="payment">Payments</option>
            <option value="alert">Alerts</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No notifications</h3>
            <p className="text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                !notification.read ? 'border-l-4 border-emerald-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()} at{' '}
                        {new Date(notification.created_at).toLocaleTimeString()}
                      </span>
                      {notification.read && (
                        <span className="flex items-center text-sm text-emerald-600">
                          <Check className="h-4 w-4 mr-1" />
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Mark as read
                    </button>
                  )}
                  {notification.data?.action && (
                    <button
                      onClick={() => handleAction(notification)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Notifications;