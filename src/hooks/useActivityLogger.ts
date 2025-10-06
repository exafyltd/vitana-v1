import { supabase } from "@/integrations/supabase/client";

export function useActivityLogger() {
  const logActivity = async ({
    activityType,
    activityData,
    contextData = {},
    dedupeKey,
  }: {
    activityType: string;
    activityData: any;
    contextData?: any;
    dedupeKey?: string;
  }) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) return;

      const sessionId = sessionStorage.getItem("session_id") || crypto.randomUUID();
      if (!sessionStorage.getItem("session_id")) {
        sessionStorage.setItem("session_id", sessionId);
      }

      const { error } = await supabase.from("user_activity_log").insert({
        user_id: session.session.user.id,
        activity_type: activityType,
        activity_data: activityData,
        context_data: contextData,
        dedupe_key: dedupeKey,
        session_id: sessionId,
      });

      if (error) {
        console.error("Failed to log activity:", error);
      }
    } catch (err) {
      console.error("Activity logging error:", err);
    }
  };

  return { logActivity };
}
