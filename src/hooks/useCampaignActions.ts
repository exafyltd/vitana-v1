import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifySuccess } from '@/lib/i18n-toast';

export function useCampaignActions() {
  const queryClient = useQueryClient();

  const activateAllPosts = useMutation({
    mutationFn: async (campaignId: string) => {
      // Get all draft posts for this campaign
      const { data: posts, error: fetchError } = await supabase
        .from("distribution_posts")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("status", "draft");

      if (fetchError) throw fetchError;

      if (!posts || posts.length === 0) {
        throw new Error("No draft posts to activate");
      }

      // Update all draft posts to published
      const { error: updateError } = await supabase
        .from("distribution_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
        .eq("status", "draft");

      if (updateError) throw updateError;

      // Call distribute-post edge function for each post
      const distributionResults = await Promise.all(
        posts.map((post) =>
          supabase.functions.invoke("distribute-post", {
            body: { postId: post.id },
          })
        )
      );

      const failures = distributionResults.filter((r) => r.error);
      if (failures.length > 0) {
        for (const f of failures) {
          console.error("Failed to distribute post:", f.error);
        }
      }

      return { postsActivated: posts.length, postsDistributed: posts.length - failures.length, postsFailed: failures.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      if (data.postsFailed > 0) {
        toast.error(`Campaign activated, but ${data.postsFailed} of ${data.postsActivated} posts failed to distribute. Check logs.`);
      } else {
        toast.success(`Campaign activated! ${data.postsActivated} posts distributed.`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to activate campaign: ${error.message}`);
    },
  });

  const pauseAllPosts = useMutation({
    mutationFn: async (campaignId: string) => {
      // Update all scheduled posts to draft
      const { error } = await supabase
        .from("distribution_posts")
        .update({ status: "draft" })
        .eq("campaign_id", campaignId)
        .eq("status", "scheduled");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distribution_posts"] });
      notifySuccess('toasts.hooks.allScheduledPostsPaused');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pause posts: ${error.message}`);
    },
  });

  return {
    activateAllPosts,
    pauseAllPosts,
  };
}
