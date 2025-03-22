import React, { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';
import DataTable from '../components/DataTable';
import { supabase } from '../../lib/supabase';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  status: string;
  recipients: string[];
  date: string;
}

function NotificationsManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'System',
    recipients: [] as string[]
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Replace with actual API call when notifications table is added
      setNotifications([
        {
          id: 1,
          title: 'System Maintenance',
          message: 'Scheduled maintenance on March 25, 2025',
          type: 'System',
          status: 'Scheduled',
          recipients: ['All Users'],
          date: '2025-03-20'
        },
        {
          id: 2,
          title: 'New Feature Release',
          message: 'Introducing chat functionality for users',
          type: 'Feature',
          status: 'Sent',
          recipients: ['All Users'],
          date: '2025-03-19'
        }
      ]);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (notification: Notification) => {
    try {
      // Implement notification sending logic
      console.log('Sending notification:', notification);
      
      // Update notification status
      const updatedNotifications = notifications.map(n =>
        n.id === notification.id ? { ...n, status: 'Sent' } : n
      );
      setNotifications(updatedNotifications);
    } catch (err) {
      console.error('Error sending notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to send notification');
    }
  };

  const handleDelete = async (notification: Notification) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;

    try {
      // Implement notification deletion logic
      setNotifications(notifications.filter(n => n.id !== notification.id));
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  };

  const handleCreateNotification = async () => {
    try {
      // Implement notification creation logic
      const newId = Math.max(...notifications.map(n => n.id)) + 1;
      const notification: Notification = {
        id: newId,
        ...newNotification,
        status: 'Scheduled',
        date: new Date().toISOString().split('T')[0]
      };
      
      setNotifications([notification, ...notifications]);
      setShowCreateModal(false);
      setNewNotification({
        title: '',
        message: '',
        type: 'System',
        recipients: []
      });
    } catch (err) {
      console.error('Error creating notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Notifications Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          <Bell className="h-4 w-4 mr-2" />
          Create Notification
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex space-x-4">
            <select
              className="rounded-md border-gray-300 focus:ring-emerald-500 focus:border-emerald-500"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="system">System</option>
              <option value="feature">Feature</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'message', label: 'Message' },
            { key: 'type', label: 'Type' },
            { key: 'status', label: 'Status' },
            { key: 'date', label: 'Date' },
          ]}
          data={notifications.filter(n => selectedType === 'all' || n.type.toLowerCase() === selectedType)}
          onDelete={handleDelete}
          customActions={(notification) => (
            <button
              onClick={() => handleSend(notification)}
              className="text-emerald-600 hover:text-emerald-900 mr-2"
              disabled={notification.status === 'Sent'}
            >
              <Send className="h-5 w-5" />
            </button>
          )}
        />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Notification</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={newNotification.type}
                    onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="System">System</option>
                    <option value="Feature">Feature</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipients</label>
                  <div className="mt-2 space-y-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={newNotification.recipients.includes('All Users')}
                        onChange={(e) => {
                          const recipients = e.target.checked
                            ? ['All Users']
                            : newNotification.recipients.filter(r => r !== 'All Users');
                          setNewNotification({ ...newNotification, recipients });
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="ml-2">All Users</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNotification}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsManagement;