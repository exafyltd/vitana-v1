import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { lookup } from '@/lib/i18n-toast';

interface PodcastShow {
  show_name: string;
  host_name: string;
}

export function usePodcastShowSubscription(show: PodcastShow, userId?: string) {
  const queryClient = useQueryClient();

  // Check if user is subscribed to this show
  const { data: isSubscribed = false, isLoading } = useQuery({
    queryKey: ["podcast-show-subscription", show.show_name, show.host_name, userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data, error } = await supabase
        .from("podcast_show_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("show_name", show.show_name)
        .eq("host_name", show.host_name)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!show.show_name && !!show.host_name,
  });

  // Toggle subscription mutation
  const toggleSubscription = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Must be logged in to subscribe");

      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from("podcast_show_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("show_name", show.show_name)
          .eq("host_name", show.host_name);

        if (error) throw error;
      } else {
        // Subscribe
        const { error } = await supabase
          .from("podcast_show_subscriptions")
          .insert({
            user_id: userId,
            show_name: show.show_name,
            host_name: show.host_name,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["podcast-show-subscription", show.show_name, show.host_name, userId] 
      });
      queryClient.invalidateQueries({ queryKey: ["popular-podcast-shows"] });
      
      toast.success(
        isSubscribed ? "Unsubscribed" : "Subscribed!",
        {
          description: isSubscribed 
            ? `You've unsubscribed from ${show.show_name}` 
            : `You're now subscribed to ${show.show_name}`,
        }
      );
    },
    onError: (error: Error) => {
      toast.error(lookup('toasts.hooks.error'), {
        description: error.message,
      });
    },
  });

  return {
    isSubscribed,
    isLoading,
    toggleSubscription: toggleSubscription.mutate,
    isToggling: toggleSubscription.isPending,
  };
}
