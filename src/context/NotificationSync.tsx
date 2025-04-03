import { useEffect } from "react";
import { supabase } from "../../client/lib/supabase";
import { useNotification } from "./NotificationProvider";

export const NotificationSync: React.FC = () => {
  const { success, error, info, warning } = useNotification();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;

    const fetchInitialNotifications = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("read", false)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchError) {
        error("Failed to load notifications");
        return;
      }

      data.forEach(
        ({
          id,
          title,
          message,
          type,
          aggregate_count,
        }: {
          id: string;
          title: string;
          message: string;
          type: "system" | "order" | "message" | "payment" | "alert";
          aggregate_count: number;
        }) => {
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
      );
    };

    fetchInitialNotifications();

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

  return null;
};