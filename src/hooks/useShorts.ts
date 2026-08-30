import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { extractStoragePath } from '@/lib/utils';

export interface Short {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[];
  category: string | null;
  language: string | null;
  src_url: string;
  thumbnail_url: string | null;
  captions_url: string | null;
  duration_sec: number | null;
  width: number | null;
  height: number | null;
  views_count: number;
  likes_count: number;
  shares_count: number;
  comments_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface FetchShortsParams {
  tag?: string;
  tags?: string[]; // Multiple tags (OR condition)
  category?: string;
  limit?: number;
}

// Stable empty params constant for cache key consistency
export const EMPTY_SHORTS_PARAMS: FetchShortsParams = {};

export const useShorts = (params: FetchShortsParams = EMPTY_SHORTS_PARAMS) => {
  return useQuery({
    queryKey: ['shorts', params],
    queryFn: async () => {
      let query = supabase
        .from('media_videos')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (params.tag) {
        query = query.contains('tags', [params.tag]);
      }

      // Filter by multiple tags (OR condition - show if video has ANY of these tags)
      if (params.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags);
      }

      if (params.category) {
        query = query.eq('category', params.category);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data: videos, error } = await query;

      if (error) throw error;
      if (!videos || videos.length === 0) return [];

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(videos.map(v => v.user_id))].filter(Boolean);
      
      if (userIds.length === 0) {
        return videos as Short[];
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name, avatar_url')
        .in('user_id', userIds);

      // Create a map of user_id to profile
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Enrich videos with profile data
      return videos.map(video => ({
        ...video,
        profiles: profileMap.get(video.user_id) || null
      })) as Short[];
    },
  });
};

export const useTrackMediaEvent = () => {
  return useMutation({
    mutationFn: async ({
      mediaId,
      mediaType,
      eventType,
      metadata = {}
    }: {
      mediaId: string;
      mediaType: 'video' | 'music' | 'podcast';
      eventType: 'play_start' | 'play_25' | 'play_50' | 'play_100' | 'like' | 'share';
      metadata?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('media_events')
        .insert({
          user_id: user?.id || null,
          media_id: mediaId,
          media_type: mediaType,
          event_type: eventType,
          metadata
        });

      if (error) throw error;

      // Update counts in media_videos table
      if (eventType === 'like') {
        const { data: video, error: likesReadError } = await supabase
          .from('media_videos')
          .select('likes_count')
          .eq('id', mediaId)
          .single();

        if (likesReadError) {
          console.error('[useTrackMediaEvent] Error reading likes_count for increment:', likesReadError);
        }

        if (video) {
          await supabase
            .from('media_videos')
            .update({ likes_count: video.likes_count + 1 })
            .eq('id', mediaId);
        }
      } else if (eventType === 'share') {
        const { data: video, error: sharesReadError } = await supabase
          .from('media_videos')
          .select('shares_count')
          .eq('id', mediaId)
          .single();

        if (sharesReadError) {
          console.error('[useTrackMediaEvent] Error reading shares_count for increment:', sharesReadError);
        }

        if (video) {
          await supabase
            .from('media_videos')
            .update({ shares_count: video.shares_count + 1 })
            .eq('id', mediaId);
        }
      } else if (eventType === 'play_start') {
        const { data: video, error: viewsReadError } = await supabase
          .from('media_videos')
          .select('views_count')
          .eq('id', mediaId)
          .single();

        if (viewsReadError) {
          console.error('[useTrackMediaEvent] Error reading views_count for increment:', viewsReadError);
        }

        if (video) {
          await supabase
            .from('media_videos')
            .update({ views_count: video.views_count + 1 })
            .eq('id', mediaId);
        }
      }
    },
  });
};

export const useIncrementViews = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      const { data: video, error: viewsReadError } = await supabase
        .from('media_videos')
        .select('views_count')
        .eq('id', videoId)
        .single();

      if (viewsReadError) {
        console.error('[useIncrementViews] Error reading views_count for increment:', viewsReadError);
      }

      if (video) {
        const { error } = await supabase
          .from('media_videos')
          .update({ views_count: video.views_count + 1 })
          .eq('id', videoId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });
};

export interface DeleteShortInput {
  id: string;
  src_url: string;
  thumbnail_url?: string | null;
}

export const useDeleteShort = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (video: DeleteShortInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: dbError } = await supabase
        .from('media_videos')
        .delete()
        .eq('id', video.id)
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      const filesToRemove: string[] = [];
      const videoPath = extractStoragePath(video.src_url, 'media');
      if (videoPath) filesToRemove.push(videoPath);

      if (video.thumbnail_url) {
        const thumbPath = extractStoragePath(video.thumbnail_url, 'media');
        if (thumbPath) filesToRemove.push(thumbPath);
      }

      if (filesToRemove.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('media')
          .remove(filesToRemove);

        if (storageError) console.error('Storage cleanup error:', storageError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId, action }: { videoId: string; action: 'like' | 'unlike' }) => {
      const { data: video } = await supabase
        .from('media_videos')
        .select('likes_count')
        .eq('id', videoId)
        .single();

      if (video) {
        const newCount = action === 'like'
          ? video.likes_count + 1
          : Math.max(0, video.likes_count - 1);

        const { error } = await supabase
          .from('media_videos')
          .update({ likes_count: newCount })
          .eq('id', videoId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shorts'] });
    },
  });
};
