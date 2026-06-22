import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardStack } from "./ProfileCardStack";
import { BookFlipView } from "./BookFlipView";
import { Button } from "@/components/ui/button";
import { Heart, X, Sparkles, Loader2, Filter, RefreshCw } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import confetti from "canvas-confetti";
import { notify, t } from '@/lib/i18n-toast';
import type { MatchReason } from '@/lib/matchReason';

interface DailyMatch {
  id: string;
  matched_user_id: string;
  match_score: number;
  match_reasons: MatchReason[];
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
  story_cue?: string;
  vitana_index?: number;
  vitana_percentile?: number;
  activity_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  top_3_interests?: string[];
  certification_badges?: string[];
  match_score: number;
  match_reasons: MatchReason[];
  shared_interests?: string[];
  streak_days?: number;
  primary_pillar?: string;
}

export function PeopleDiscoveryHero() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { openPreview } = useProfilePreview();
  const { people: demoProfiles } = useDemoMatches();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interestFilter, setInterestFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [pillarFilter, setPillarFilter] = useState<string>("all");

  // Fetch daily matches
  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['daily-matches'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: existingMatches } = await supabase
        .from('daily_matches')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .is('action', null)
        .order('match_score', { ascending: false });

      if (!existingMatches || existingMatches.length === 0) {
        const { error } = await supabase.functions.invoke('generate-daily-matches');
        if (error) {
          console.error('Error generating matches:', error);
          return null;
        }

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
          shared_interests: ['Yoga', 'Nutrition', 'Mindfulness'],
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
    
    // Trigger confetti!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7']
    });
    
    notify('toasts.discovery.connectionRequestSent', 'toasts.discovery.theyLlNotifiedYourInterest');
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
    
    // Trigger confetti with golden colors!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#fde047'],
      startVelocity: 45,
    });
    
    notify('toasts.discovery.superConnectSent', 'toasts.discovery.youLlAppearAtTopTheir');
  };

  const handleProfileTap = (userId: string) => {
    openPreview(userId);
  };

  // Use demo data if no real matches, or if real profiles are too sparse
  const displayProfiles = useMemo(() => {
    // Check if a profile is "rich enough" to display
    const isProfileRich = (p: MatchProfile) => 
      !!p.avatar_url && 
      (p.bio?.length || 0) >= 40 && 
      !!p.professional_headline && 
      (p.top_3_interests?.length || 0) > 0;

    // Only use real profiles if at least half are rich
    const richProfiles = profiles?.filter(isProfileRich) || [];
    const useRealProfiles = richProfiles.length >= Math.ceil((profiles?.length || 0) / 2) && richProfiles.length > 0;

    let baseProfiles = useRealProfiles
      ? richProfiles
      : demoProfiles.map(p => ({
          user_id: p.user_id,
          display_name: p.display_name,
          age: p.age,
          avatar_url: p.avatar_url,
          bio: p.bio,
          location: p.location,
          professional_headline: p.professional_headline,
          story_cue: p.story_cue,
          vitana_index: p.vitana_index,
          vitana_percentile: p.vitana_percentile,
          activity_time_preference: p.activity_time_preference,
          top_3_interests: p.top_3_interests,
          certification_badges: p.certification_badges,
          match_score: p.compatibility_score,
          match_reasons: [p.match_reason],
          shared_interests: p.shared_interests,
          streak_days: p.streak_days,
          primary_pillar: p.primary_pillar,
        }));

    // Apply filters
    if (interestFilter !== "all") {
      baseProfiles = baseProfiles.filter(p => 
        p.top_3_interests?.some(i => i.toLowerCase().includes(interestFilter.toLowerCase()))
      );
    }
    if (regionFilter !== "all") {
      baseProfiles = baseProfiles.filter(p => 
        p.location?.toLowerCase()?.includes(regionFilter.toLowerCase()) ?? false
      );
    }

    return baseProfiles;
  }, [profiles, demoProfiles, interestFilter, regionFilter]);

  // Preload images for current + next 5 profiles
  const imageUrls = useMemo(() => {
    return displayProfiles
      .filter(p => p.avatar_url)
      .map(p => p.avatar_url!);
  }, [displayProfiles]);

  useImagePreloader(imageUrls, 6);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const current = displayProfiles[currentIndex];
      if (!current) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePass(current.user_id);
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleConnect(current.user_id);
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSuperConnect(current.user_id);
        setCurrentIndex(prev => prev + 1);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, displayProfiles]);

  const viewedCount = currentIndex;
  const totalCount = displayProfiles.length;
  const progress = totalCount > 0 ? (viewedCount / totalCount) * 100 : 0;

  // Calculate average match score for dynamic progress bar color
  const averageMatchScore = useMemo(() => {
    if (displayProfiles.length === 0) return 0;
    const sum = displayProfiles.reduce((acc, profile) => acc + profile.match_score, 0);
    return sum / displayProfiles.length;
  }, [displayProfiles]);

  const getProgressBarGradient = (avgScore: number) => {
    if (avgScore > 80) return "from-emerald-400 via-emerald-500 to-emerald-600";
    if (avgScore > 60) return "from-lime-400 via-lime-500 to-lime-600";
    return "from-amber-400 via-amber-500 to-amber-600";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#ffe8f0] via-[#f2f6ff] to-[#e0f7f4] dark:from-slate-950 dark:via-purple-950/20 dark:to-teal-950/20 animate-gradient-x" 
           style={{ backgroundSize: '200% 200%' }} 
      />

      <div className="max-w-7xl mx-auto px-4 py-2 space-y-2">
        {/* Hero Header - System block */}
        <div className="text-center pt-2 pb-1">
          {/* Title with inline emoji */}
          <h2 className="text-lg font-semibold text-foreground">
            {t('screens.discovery.meetVitanalandCitizens')}
          </h2>
          
          {/* Status line - standard metadata */}
          <p className="text-xs text-muted-foreground mt-1">{t('screens.discovery.value0NewTodayViewedcountTotalcount', { value0: totalCount - viewedCount, viewedCount, totalCount })}
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-4 w-4 p-0 ml-1.5 opacity-40 hover:opacity-80 inline-flex items-center justify-center">
              <RefreshCw className="h-2.5 w-2.5" />
            </Button>
          </p>
        </div>

        {/* Book Flip View (Desktop) / Card Stack (Mobile) */}
        <div className="hidden lg:block">
          <BookFlipView
            profiles={displayProfiles}
            currentIndex={currentIndex}
            onConnect={handleConnect}
            onPass={handlePass}
            onSuperConnect={handleSuperConnect}
            onProfileTap={handleProfileTap}
            onIndexChange={setCurrentIndex}
          />
        </div>
        
        <div className="lg:hidden max-w-md mx-auto">
          <ProfileCardStack
            profiles={displayProfiles}
            onConnect={handleConnect}
            onPass={handlePass}
            onSuperConnect={handleSuperConnect}
            onProfileTap={handleProfileTap}
          />
        </div>

        {/* Large Expressive Action Buttons */}
        <div className="flex items-center justify-center gap-8 mt-2">
          {/* Pass Button */}
          <button
            onClick={() => {
              const current = displayProfiles[currentIndex];
              if (current) {
                handlePass(current.user_id);
                setCurrentIndex(prev => prev + 1);
              }
            }}
            className="group flex flex-col items-center gap-2 transition-all"
          >
            <div className="relative">
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-red-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Button body */}
              <div className="relative h-14 w-14 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/40 hover:border-red-500/60 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-110">
                <X className="h-7 w-7 text-muted-foreground group-hover:text-red-500 transition-colors" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-bold text-foreground group-hover:text-red-500 transition-colors">{t('screens.discovery.pass')}</div>
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
            className="group flex flex-col items-center gap-2 transition-all"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-2xl opacity-60 group-hover:opacity-100" />
              
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-amber-500/30 backdrop-blur-xl border-2 border-yellow-500/50 hover:border-yellow-400 flex items-center justify-center transition-all duration-200 shadow-2xl group-hover:scale-110">
                <Sparkles className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">{t('screens.discovery.super')}</div>
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
            className="group flex flex-col items-center gap-2 transition-all"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-green-400/30 to-emerald-500/30 backdrop-blur-xl border border-border/40 hover:border-green-500/60 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-110">
                <Heart className="h-7 w-7 text-green-500" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-bold text-green-600 dark:text-green-400">{t('screens.discovery.connect')}</div>
            </div>
          </button>
        </div>

        {/* Filter Controls & Keyboard Shortcuts */}
        <div className="border-t border-white/10 pt-2 mt-1.5">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">{t('screens.discovery.filters')}</span>
            </div>
            
            <Select value={interestFilter} onValueChange={setInterestFilter}>
              <SelectTrigger className="w-[160px] bg-background/60 backdrop-blur border-border/40">
                <SelectValue placeholder={t('screens.discovery.interests')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('screens.discovery.allInterests')}</SelectItem>
                <SelectItem value="yoga">{t('screens.discovery.yoga')}</SelectItem>
                <SelectItem value="nutrition">{t('screens.discovery.nutrition')}</SelectItem>
                <SelectItem value="biohacking">{t('screens.discovery.biohacking')}</SelectItem>
                <SelectItem value="running">{t('screens.discovery.running')}</SelectItem>
                <SelectItem value="meditation">{t('screens.discovery.meditation')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[160px] bg-background/60 backdrop-blur border-border/40">
                <SelectValue placeholder={t('screens.discovery.region')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('screens.discovery.allRegions')}</SelectItem>
                <SelectItem value="san francisco">{t('screens.discovery.sanFrancisco')}</SelectItem>
                <SelectItem value="los angeles">{t('screens.discovery.losAngeles')}</SelectItem>
                <SelectItem value="new york">{t('screens.discovery.newYork')}</SelectItem>
                <SelectItem value="austin">{t('screens.discovery.austin')}</SelectItem>
                <SelectItem value="seattle">{t('screens.discovery.seattle')}</SelectItem>
              </SelectContent>
            </Select>
            
            {(interestFilter !== "all" || regionFilter !== "all") && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setInterestFilter("all");
                  setRegionFilter("all");
                  setPillarFilter("all");
                }}
              >{t('screens.discovery.clearFilters')}
              </Button>
            )}
            
            {/* Keyboard Shortcuts in same line */}
            <span className="text-[10px] text-muted-foreground ml-4">
              {t('screens.discovery.passConnectSuper')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
