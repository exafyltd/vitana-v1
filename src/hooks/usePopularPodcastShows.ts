import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PopularShow {
  show_name: string;
  host_name: string;
  episode_count: number;
  latest_episode_date: string;
  category: string;
  subscriber_count: number;
}

export function usePopularPodcastShows() {
  return useQuery({
    queryKey: ["popular-podcast-shows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("popular_podcast_shows")
        .select("*");

      if (error) throw error;
      return data as PopularShow[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
