import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { notifySuccess } from '@/lib/i18n-toast';

export type ScheduledPost = Database["public"]["Tables"]["scheduled_posts"]["Row"];
export type ScheduledPostInsert = Database["public"]["Tables"]["scheduled_posts"]["Insert"];

export function useScheduledPosts() {
  const queryClient = useQueryClient();

  const { data: scheduledPosts, isLoading } = useQuery({
    queryKey: ["scheduled_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_posts")
        .select("*, distribution_posts(*)")
        .eq("status", "pending")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const schedulePost = useMutation({
    mutationFn: async (scheduleData: ScheduledPostInsert) => {
      // Update post status
      await supabase
        .from("distribution_posts")
        .update({
          status: "scheduled",
          scheduled_for: scheduleData.scheduled_for,
        })
        .eq("id", scheduleData.post_id);

      // Create scheduled entry
      const { data, error } = await supabase
        .from("scheduled_posts")
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      notifySuccess('toasts.hooks.postScheduledSuccessfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule post: ${error.message}`);
    },
  });

  const cancelScheduled = useMutation({
    mutationFn: async (scheduledId: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "cancelled" })
        .eq("id", scheduledId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
      notifySuccess('toasts.hooks.scheduledPostCancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  const pauseScheduled = useMutation({
    mutationFn: async (scheduledId: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "paused" })
        .eq("id", scheduledId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
      notifySuccess('toasts.hooks.scheduledPostPaused');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause: ${error.message}`);
    },
  });

  const resumeScheduled = useMutation({
    mutationFn: async (scheduledId: string) => {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ status: "pending" })
        .eq("id", scheduledId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled_posts"] });
      notifySuccess('toasts.hooks.scheduledPostResumed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resume: ${error.message}`);
    },
  });

  return {
    scheduledPosts,
    isLoading,
    schedulePost,
    cancelScheduled,
    pauseScheduled,
    resumeScheduled,
  };
}
