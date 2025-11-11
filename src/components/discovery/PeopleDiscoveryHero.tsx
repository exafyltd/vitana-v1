import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardStack } from "./ProfileCardStack";
import { Button } from "@/components/ui/button";
import { Heart, X, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { useDemoMatches } from "@/hooks/useDemoMatches";

interface DailyMatch {
  id: string;
  matched_user_id: string;
  match_score: number;
  match_reasons: string[];
  viewed_at: string | null;
}

interface MatchProfile {
  user_id: string;
  display_name: string;
  age?: number;
  avatar_url?: string;
  bio?: string;
  location?: string;
  professional_headline?: string;
  vitana_index?: number;
  vitana_percentile?: number;
  activity_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  top_3_interests?: string[];
  certification_badges?: string[];
  match_score: number;
  match_reasons: string[];
  shared_interests?: string[];
}

export function PeopleDiscoveryHero() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openPreview } = useProfilePreview();
  const { people: demoProfiles } = useDemoMatches();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch daily matches
  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['daily-matches'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to get existing matches
      const { data: existingMatches } = await supabase
        .from('daily_matches')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .is('action', null)
        .order('match_score', { ascending: false });

      // If no matches, generate new ones
      if (!existingMatches || existingMatches.length === 0) {
        const { error } = await supabase.functions.invoke('generate-daily-matches');
        if (error) {
          console.error('Error generating matches:', error);
          // Fall back to demo data
          return null;
        }

        // Fetch newly generated matches
        const { data: newMatches } = await supabase
          .from('daily_matches')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .is('action', null)
          .order('match_score', { ascending: false });

        return newMatches as DailyMatch[];
      }

      return existingMatches as DailyMatch[];
    },
  });

  // Fetch profile details for matches
  const { data: profiles } = useQuery({
    queryKey: ['match-profiles', matches?.map(m => m.matched_user_id).join(',')],
    enabled: !!matches && matches.length > 0,
    queryFn: async () => {
      if (!matches) return [];

      const userIds = matches.map(m => m.matched_user_id);
      const profilePromises = userIds.map(async (userId) => {
        const { data } = await supabase
          .rpc('get_user_profile_by_identifier', { identifier: userId });
        return data?.[0];
      });

      const profilesData = await Promise.all(profilePromises);

      // Combine with match data
      return matches.map((match, idx) => {
        const profile = profilesData[idx];
        return {
          user_id: match.matched_user_id,
          display_name: profile?.display_name || profile?.full_name || 'Unknown User',
          avatar_url: profile?.avatar_url,
          bio: profile?.bio,
          location: profile?.location,
          match_score: match.match_score,
          match_reasons: match.match_reasons,
          shared_interests: ['Yoga', 'Nutrition', 'Mindfulness'], // Demo data
        };
      }) as MatchProfile[];
    },
  });

  // Update match action mutation
  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, action }: { matchId: string; action: string }) => {
      const { error } = await supabase
        .from('daily_matches')
        .update({ action, viewed_at: new Date().toISOString() })
        .eq('id', matchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-matches'] });
    },
  });

  // Connection request mutation
  const createConnectionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      requestType 
    }: { 
      userId: string; 
      requestType: 'normal' | 'super' 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('connection_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: userId,
          request_type: requestType,
          status: 'pending',
        });

      if (error) throw error;
    },
  });

  const handleConnect = (userId: string) => {
    createConnectionMutation.mutate({ userId, requestType: 'normal' });
    const match = matches?.find(m => m.matched_user_id === userId);
    if (match) {
      updateMatchMutation.mutate({ matchId: match.id, action: 'connect' });
    }
    toast({
      title: "Connection request sent! 💚",
      description: "They'll be notified of your interest.",
    });
  };

  const handlePass = (userId: string) => {
    const match = matches?.find(m => m.matched_user_id === userId);
    if (match) {
      updateMatchMutation.mutate({ matchId: match.id, action: 'pass' });
    }
  };

  const handleSuperConnect = (userId: string) => {
    createConnectionMutation.mutate({ userId, requestType: 'super' });
    const match = matches?.find(m => m.matched_user_id === userId);
    if (match) {
      updateMatchMutation.mutate({ matchId: match.id, action: 'super_connect' });
    }
    toast({
      title: "Super Connect sent! ⭐",
      description: "You'll appear at the top of their matches!",
    });
  };

  const handleProfileTap = (userId: string) => {
    openPreview(userId);
  };

  // Use demo data if no real matches
  const displayProfiles = profiles && profiles.length > 0 
    ? profiles 
    : demoProfiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        age: p.age,
        avatar_url: p.avatar_url,
        bio: p.bio,
        location: p.location,
        professional_headline: p.professional_headline,
        vitana_index: p.vitana_index,
        vitana_percentile: p.vitana_percentile,
        activity_time_preference: p.activity_time_preference,
        top_3_interests: p.top_3_interests,
        certification_badges: p.certification_badges,
        match_score: p.compatibility_score,
        match_reasons: [p.match_reason],
        shared_interests: p.shared_interests,
      }));

  const viewedCount = currentIndex;
  const totalCount = displayProfiles.length;
  const progress = totalCount > 0 ? (viewedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl">👋</span>
          <h2 className="text-3xl font-bold text-foreground">
            Meet Vitanians
          </h2>
        </div>
        <p className="text-base text-muted-foreground">
          You have <span className="font-semibold text-accent">{totalCount - viewedCount} new matches</span> today
        </p>
        
        {/* Progress Bar with Count */}
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Discovery</span>
            <span className="font-semibold text-foreground">{viewedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
            <div 
              className="h-full bg-gradient-to-r from-accent via-accent to-accent/80 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Stack */}
      <div className="max-w-md mx-auto">
        <ProfileCardStack
          profiles={displayProfiles}
          onConnect={handleConnect}
          onPass={handlePass}
          onSuperConnect={handleSuperConnect}
          onProfileTap={handleProfileTap}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 mt-8">
        {/* Pass Button */}
        <button
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handlePass(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
          className="group relative"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-full bg-muted hover:bg-red-500/20 border-2 border-border hover:border-red-500/50 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-red-500/20 hover:scale-110">
              <X className="h-7 w-7 text-muted-foreground group-hover:text-red-500 transition-colors" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-red-500 transition-colors">
              Pass
            </span>
          </div>
        </button>

        {/* Super Connect Button */}
        <button
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handleSuperConnect(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
          className="group relative"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/20 hover:from-yellow-400/40 hover:to-amber-500/40 border-2 border-yellow-500/40 hover:border-yellow-500/60 flex items-center justify-center transition-all duration-200 shadow-xl hover:shadow-yellow-500/30 hover:scale-110">
              <Sparkles className="h-9 w-9 text-yellow-500 group-hover:text-yellow-400 transition-colors" />
            </div>
            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors">
              Super
            </span>
          </div>
        </button>

        {/* Connect Button */}
        <button
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handleConnect(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
          className="group relative"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-500/20 hover:from-green-400/40 hover:to-emerald-500/40 border-2 border-green-500/40 hover:border-green-500/60 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-green-500/30 hover:scale-110">
              <Heart className="h-7 w-7 text-green-500 group-hover:text-green-400 transition-colors" />
            </div>
            <span className="text-xs font-semibold text-green-600 dark:text-green-500 group-hover:text-green-500 dark:group-hover:text-green-400 transition-colors">
              Connect
            </span>
          </div>
        </button>
      </div>

      {/* Swipe Instructions */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        💡 <span className="font-medium">Swipe or tap</span> • Left to pass • Right to connect • Up for super
      </p>
    </div>
  );
}
