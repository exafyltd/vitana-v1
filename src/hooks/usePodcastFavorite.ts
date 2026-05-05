import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notifyError } from '@/lib/i18n-toast';

export function usePodcastFavorite(podcastId: string, userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if podcast is favorited
  const { data: isFavorited = false, isLoading } = useQuery({
    queryKey: ["podcast-favorite", podcastId, userId],
    queryFn: async () => {
      if (!userId) return false;
      
      const { data, error } = await supabase
        .from("podcast_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("podcast_id", podcastId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!userId,
  });

  // Toggle favorite mutation
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Must be logged in");

      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from("podcast_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("podcast_id", podcastId);

        if (error) throw error;
      } else {
        // Add favorite
        const { error } = await supabase
          .from("podcast_favorites")
          .insert({
            user_id: userId,
            podcast_id: podcastId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcast-favorite", podcastId, userId] });
      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        duration: 2000,
      });
    },
    onError: (error) => {
      notifyError('toasts.hooks.error');
    },
  });

  return {
    isFavorited,
    isLoading,
    toggleFavorite: toggleFavorite.mutate,
    isToggling: toggleFavorite.isPending,
  };
}
