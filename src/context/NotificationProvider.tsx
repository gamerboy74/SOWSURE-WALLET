import React, { createContext, useContext, useEffect } from "react";
import { toast, ToastOptions, Toast } from "react-hot-toast";
import { AlertCircle, CheckCircle, Info, AlertTriangle, LucideIcon } from "lucide-react";
import { supabase } from "../../client/lib/supabase";

// Extend ToastOptions to include id
interface CustomToastOptions extends ToastOptions {
  id?: string;
}

interface NotificationContextType {
  success: (message: string, options?: CustomToastOptions) => void;
  error: (message: string, options?: CustomToastOptions) => void;
  info: (message: string, options?: CustomToastOptions) => void;
  warning: (message: string, options?: CustomToastOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultOptions: CustomToastOptions = {
  duration: 4000,
  position: "top-right",
};

interface ToastComponentProps {
  t: Toast; // Use react-hot-toast's Toast type
  title: string;
  message: string;
  icon: LucideIcon;
  iconColor: string;
  id: string; // Add id for marking as read
}

const ToastComponent = ({ t, title, message, icon: Icon, iconColor, id }: ToastComponentProps) => (
  <div
    className={`${
      t.visible ? "animate-enter" : "animate-leave"
    } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
  >
    <div className="flex-1 w-0 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
      </div>
    </div>
    <div className="flex border-l border-gray-200">
      <button
        onClick={async () => {
          await supabase.rpc("mark_notification_read", { p_notification_id: id });
          toast.dismiss(t.id);
        }}
        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
      >
        Close
      </button>
    </div>
  </div>
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const success = (message: string, options?: CustomToastOptions) =>
    toast.custom(
      (t) => (
        <ToastComponent
          t={t}
          title="Success"
          message={message}
          icon={CheckCircle}
          iconColor="text-emerald-500"
          id={options?.id || ""}
        />
      ),
      { ...defaultOptions, ...options }
    );

  const error = (message: string, options?: CustomToastOptions) =>
    toast.custom(
      (t) => (
        <ToastComponent
          t={t}
          title="Error"
          message={message}
          icon={AlertCircle}
          iconColor="text-red-500"
          id={options?.id || ""}
        />
      ),
      { ...defaultOptions, ...options }
    );

  const info = (message: string, options?: CustomToastOptions) =>
    toast.custom(
      (t) => (
        <ToastComponent
          t={t}
          title="Info"
          message={message}
          icon={Info}
          iconColor="text-blue-500"
          id={options?.id || ""}
        />
      ),
      { ...defaultOptions, ...options }
    );

  const warning = (message: string, options?: CustomToastOptions) =>
    toast.custom(
      (t) => (
        <ToastComponent
          t={t}
          title="Warning"
          message={message}
          icon={AlertTriangle}
          iconColor="text-yellow-500"
          id={options?.id || ""}
        />
      ),
      { ...defaultOptions, ...options }
    );

  // Real-time subscription with Supabase
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const setupSubscription = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      channel = supabase
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
            const { id, title, message, type, aggregate_count } = payload.new as {
              id: string;
              title: string;
              message: string;
              type: "system" | "order" | "message" | "payment" | "alert";
              aggregate_count: number;
            };
            const notify = {
              system: info,
              order: success,
              message: info,
              payment: success,
              alert: warning,
            }[type] || info;
            const displayMessage = aggregate_count > 1 ? `${message} (${aggregate_count} occurrences)` : message;
            notify(`${title}: ${displayMessage}`, { id });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [success, error, info, warning]);

  return (
    <NotificationContext.Provider value={{ success, error, info, warning }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};