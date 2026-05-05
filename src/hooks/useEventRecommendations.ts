import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { notify, notifyError } from '@/lib/i18n-toast';

interface EventRecommendation {
  match_score: number;
  match_reasons: any;
  global_community_events: any;
}

export function useEventRecommendations() {
  const [recommendations, setRecommendations] = useState<EventRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch existing recommendations
  const fetchRecommendations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('useEventRecommendations: Fetching recommendations for user:', user.id);
      
      const { data, error } = await supabase
        .from('event_recommendations')
        .select(`
          match_score,
          match_reasons,
          global_community_events (*)
        `)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('match_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      console.log('useEventRecommendations: Fetched recommendations:', data);
      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate new recommendations
  const generateRecommendations = async (type: 'events' | 'groups' | 'all' = 'events') => {
    if (!user) {
      notifyError('toasts.hooks.authenticationRequired', 'toasts.hooks.pleaseSignGetPersonalizedRecommendations');
      return;
    }
    
    try {
      setGenerating(true);
      console.log('useEventRecommendations: Generating recommendations, type:', type);
      
      notify('toasts.hooks.generatingRecommendations', 'toasts.hooks.aiAnalyzingYourPreferences');

      const { data, error } = await supabase.functions.invoke('generate-enhanced-recommendations', {
        body: { type }
      });

      if (error) throw error;
      
      console.log('useEventRecommendations: Generation complete:', data);
      
      notify('toasts.hooks.recommendationsReady');
      
      // Refresh recommendations after generation
      await fetchRecommendations();
      
      return data;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      notifyError('toasts.hooks.error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user?.id]);

  return {
    recommendations,
    loading,
    generating,
    fetchRecommendations,
    generateRecommendations
  };
}
