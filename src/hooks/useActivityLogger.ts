import { supabase } from "@/integrations/supabase/client";
import { notifyError } from '@/lib/i18n-toast';

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

      const sessionId = sessionStorage.getItem("vitana_session_id") || crypto.randomUUID();
      if (!sessionStorage.getItem("vitana_session_id")) {
        sessionStorage.setItem("vitana_session_id", sessionId);
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
        console.error("[ActivityLogger] insert failed", { activityType, error });
        if (import.meta.env.DEV) {
          notifyError('toasts.hooks.activityLoggingFailed');
        }
      }
    } catch (err) {
      console.error("[ActivityLogger] unexpected error", err);
    }
  };

  return { logActivity };
}
