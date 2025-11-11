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
  avatar_url?: string;
  bio?: string;
  location?: string;
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
        avatar_url: p.avatar_url,
        bio: p.bio,
        location: `${p.distance_km}km away`,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Discover People
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {viewedCount}/{totalCount} viewed today
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <Sparkles className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
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

      {/* Action Buttons (Desktop) */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-16 w-16"
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handlePass(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
        >
          <X className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full h-20 w-20 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handleSuperConnect(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
        >
          <Sparkles className="h-8 w-8" />
        </Button>
        <Button
          variant="default"
          size="lg"
          className="rounded-full h-16 w-16 bg-accent hover:bg-accent/90"
          onClick={() => {
            const current = displayProfiles[currentIndex];
            if (current) {
              handleConnect(current.user_id);
              setCurrentIndex(prev => prev + 1);
            }
          }}
        >
          <Heart className="h-6 w-6" />
        </Button>
      </div>

      {/* Swipe Instructions */}
      <p className="text-center text-sm text-muted-foreground">
        Swipe left to pass, right to connect, or up for super connect
      </p>
    </div>
  );
}
