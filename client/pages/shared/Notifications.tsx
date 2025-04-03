import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronDown,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "system" | "order" | "message" | "payment" | "alert";
  read: boolean;
  created_at: string;
  read_at: string | null;
  data: Record<string, any>;
  aggregate_count: number;
}

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | Notification["type"]>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadNotifications();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription().catch((err) => {
      console.error("Error setting up subscription:", err);
      setError("Failed to set up real-time updates");
    });

    return () => {};
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user");
      }

      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase.rpc("mark_notification_read", {
        p_notification_id: notificationId,
      });
      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true, read_at: new Date().toISOString() }
            : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.data?.product_id) {
      navigate(`/product/${notification.data.product_id}`); // Updated to match route
    } else if (notification.data?.action) {
      handleAction(notification);
    }
  };

  const handleAction = (notification: Notification) => {
    switch (notification.data?.action) {
      case "explore_marketplace":
        navigate("/marketplace");
        break;
      case "view_order":
        navigate(`/orders/${notification.data.orderId}`);
        break;
      default:
        console.log("Unhandled action:", notification.data?.action);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "system":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "order":
        return <ShoppingBag className="h-5 w-5 text-emerald-500" />;
      case "message":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "payment":
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !notification.read) ||
      notification.type === filter;
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Loading notifications" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md ${
              filter === "all" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Show all notifications"
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-md ${
              filter === "unread" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Show unread notifications"
          >
            Unread
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-center" role="alert">
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
            aria-label="Search notifications"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <select
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            aria-label="Filter notifications by type"
          >
            <option value="all">All Types</option>
            <option value="unread">Unread</option>
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
                !notification.read ? "border-l-4 border-emerald-500" : ""
              } cursor-pointer hover:shadow-lg transition-shadow duration-200`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{notification.title}</h3>
                    <p className="mt-1 text-gray-600">
                      {notification.message}
                      {notification.aggregate_count > 1 && (
                        <span className="text-gray-500 ml-2">
                          ({notification.aggregate_count} occurrences)
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleDateString()} at{" "}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                      aria-label={`Mark notification ${notification.title} as read`}
                    >
                      Mark as read
                    </button>
                  )}
                  {notification.data?.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(notification);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm"
                      aria-label={`View details for ${notification.title}`}
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