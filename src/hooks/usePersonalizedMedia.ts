import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/context/ProfileProvider";

interface PersonalizedMediaOptions {
  limit?: number;
  mediaType?: 'Music' | 'Podcast' | 'Video' | 'all';
  contextTags?: string[];
}

export function usePersonalizedMedia(options: PersonalizedMediaOptions = {}) {
  const { limit = 5, mediaType = 'all', contextTags = [] } = options;
  const { profile } = useProfile();

  return useQuery({
    queryKey: ['personalized-media', limit, mediaType, contextTags],
    queryFn: async () => {
      // Build query
      let query = supabase
        .from('media_uploads')
        .select('*, music_metadata(*), podcast_metadata(*), video_metadata(*)')
        .eq('status', 'approved')
        .eq('is_public', true);

      // Filter by media type if specified (case-insensitive)
      if (mediaType !== 'all') {
        query = query.eq('media_type', mediaType.toLowerCase());
      }

      // Get base results
      const { data: mediaData, error } = await query
        .order('created_at', { ascending: false })
        .limit(50); // Get more to score and filter

      if (error) throw error;
      if (!mediaData || mediaData.length === 0) return [];

      // Fetch creator profiles
      const userIds = [...new Set(mediaData.map(m => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Tag synonym mapping for better matching
      const tagSynonyms: Record<string, string[]> = {
        'Sleep': ['Evening', 'Relaxing', 'Meditation', 'Sleep', 'Calm'],
        'Mental Health': ['Focus', 'Calming', 'Mindfulness', 'Meditation', 'Wellness'],
        'Wellness': ['Wellness', 'Health', 'Lifestyle', 'Calming', 'Relaxing'],
        'Lifestyle': ['Wellness', 'Lifestyle', 'Health'],
        'Energetic': ['Morning', 'Energetic', 'Uplifting', 'Active'],
        'Nature': ['Environment', 'Nature', 'Ambient', 'Outdoor'],
        'Popular': ['Trending', 'Popular', 'Community'],
      };

      // Expand context tags with synonyms
      const expandedContextTags = contextTags.flatMap(tag => 
        tagSynonyms[tag] || [tag]
      );

      // Score each media item based on personalization factors
      const scoredMedia = mediaData.map((media) => {
        let score = 0;
        
        // Factor 1: Recency (newer content gets higher score)
        const daysOld = (Date.now() - new Date(media.created_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysOld); // Up to 10 points for very recent content
        
        // Factor 2: Context tags matching (with synonyms)
        if (expandedContextTags.length > 0 && media.tags) {
          const matchingTags = media.tags.filter(tag => 
            expandedContextTags.some(ctxTag => 
              tag.toLowerCase().includes(ctxTag.toLowerCase()) ||
              ctxTag.toLowerCase().includes(tag.toLowerCase())
            )
          );
          score += matchingTags.length * 5; // 5 points per matching tag
        }
        
        // Factor 3: Generic wellness tags boost
        if (media.tags?.some(t => ['Wellness', 'Health', 'Lifestyle'].includes(t))) {
          score += 3; // Small boost for general wellness content
        }
        
        // Factor 4: Time of day appropriateness
        const hour = new Date().getHours();
        if (media.tags) {
          if (hour < 12 && media.tags.some(t => ['Energetic', 'Morning', 'Uplifting'].includes(t))) {
            score += 10;
          } else if (hour >= 12 && hour < 17 && media.tags.some(t => ['Focus', 'Productivity', 'Calming'].includes(t))) {
            score += 10;
          } else if (hour >= 17 && media.tags.some(t => ['Relaxing', 'Evening', 'Meditation', 'Sleep'].includes(t))) {
            score += 10;
          }
        }
        
        // Factor 5: Content quality indicators
        if (media.thumbnail_url) score += 2; // Has thumbnail
        if (media.description && media.description.length > 50) score += 2; // Good description
        
        const creatorProfile = profilesMap.get(media.user_id);
        
        // Safely handle metadata (can be array or single object)
        const musicMeta = Array.isArray(media.music_metadata) 
          ? media.music_metadata[0] 
          : media.music_metadata;
        const podcastMeta = Array.isArray(media.podcast_metadata) 
          ? media.podcast_metadata[0] 
          : media.podcast_metadata;
        
        return {
          ...media,
          score,
          // Transform to expected format with robust fallbacks
          artist: musicMeta?.artist_name || 
                  podcastMeta?.host_name || 
                  creatorProfile?.display_name || 
                  'Unknown Artist',
          duration: musicMeta?.duration ?? 
                   podcastMeta?.duration ?? 
                   0
        };
      });

      // If no context tags or weak scoring, return most recent
      if (contextTags.length === 0 || scoredMedia.length === 0) {
        return scoredMedia
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
      }
      
      const maxScore = Math.max(...scoredMedia.map(m => m.score), 0);
      
      // If weak matches (max score < 2), return recent content
      if (maxScore < 2) {
        return scoredMedia
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit);
      }

      // Otherwise, sort by score (highest first) and return top N
      return scoredMedia
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
