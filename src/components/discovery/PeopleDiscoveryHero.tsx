import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardStack } from "./ProfileCardStack";
import { BookFlipView } from "./BookFlipView";
import { Button } from "@/components/ui/button";
import { Heart, X, Sparkles, Loader2, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import confetti from "canvas-confetti";

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
  story_cue?: string;
  vitana_index?: number;
  vitana_percentile?: number;
  activity_time_preference?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  top_3_interests?: string[];
  certification_badges?: string[];
  match_score: number;
  match_reasons: string[];
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
    
    // Trigger confetti with golden colors!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#fde047'],
      startVelocity: 45,
    });
    
    toast({
      title: "Super Connect sent! ⭐",
      description: "You'll appear at the top of their matches!",
    });
  };

  const handleProfileTap = (userId: string) => {
    openPreview(userId);
  };

  // Use demo data if no real matches, and apply filters
  const displayProfiles = useMemo(() => {
    let baseProfiles = profiles && profiles.length > 0 
      ? profiles 
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
        p.location?.toLowerCase().includes(regionFilter.toLowerCase())
      );
    }

    return baseProfiles;
  }, [profiles, demoProfiles, interestFilter, regionFilter]);

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
    <section className="relative w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#ffe8f0] via-[#f2f6ff] to-[#e0f7f4] dark:from-card dark:via-background dark:to-card py-8">
      <div className="max-w-[1200px] mx-auto px-4 w-full flex flex-col items-center space-y-2">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
            <span className="text-2xl">👋</span>
            Meet Vitanians
          </h2>
          <div className="flex items-center justify-center gap-4">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium tracking-tight">
              You have <span className="text-2xl font-bold">{totalCount - viewedCount}</span> new matches today
            </p>
            {/* Progress Bar - Inline */}
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${getProgressBarGradient(averageMatchScore)} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {viewedCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>

        {/* Card Stack with Match Insight */}
        <div className="flex flex-col items-center space-y-2">
          <div className="hidden md:block">
            <BookFlipView
              profiles={displayProfiles}
              onConnect={handleConnect}
              onPass={handlePass}
              onSuperConnect={handleSuperConnect}
              onProfileTap={handleProfileTap}
            />
          </div>
          
          <div className="md:hidden max-w-md mx-auto">
            <ProfileCardStack
              profiles={displayProfiles}
              onConnect={handleConnect}
              onPass={handlePass}
              onSuperConnect={handleSuperConnect}
              onProfileTap={handleProfileTap}
            />
          </div>
          
          {/* Match Insight Chip - Below Card */}
          {displayProfiles[currentIndex] && (
            <motion.div
              key={`insight-${displayProfiles[currentIndex].user_id}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="text-sm text-white/80 italic bg-emerald-100/10 px-4 py-1.5 rounded-full backdrop-blur-md"
            >
              ✨ {displayProfiles[currentIndex].match_reasons?.[0] || "Great wellness match"}
            </motion.div>
          )}
        </div>

        {/* Action Buttons with Labels */}
        <div className="flex items-center justify-center gap-10 mt-4">
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const current = displayProfiles[currentIndex];
                if (current) {
                  handlePass(current.user_id);
                  setCurrentIndex(prev => prev + 1);
                }
              }}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-card/80 backdrop-blur border-2 hover:border-red-500/50 hover:bg-red-500/10 transition-all group"
            >
              <X className="h-6 w-6 text-muted-foreground group-hover:text-red-500 transition-colors" />
            </Button>
            <span className="text-[11px] text-muted-foreground font-medium">Pass (←)</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                const current = displayProfiles[currentIndex];
                if (current) {
                  handleSuperConnect(current.user_id);
                  setCurrentIndex(prev => prev + 1);
                }
              }}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 shadow-lg hover:shadow-xl transition-all group"
            >
              <Sparkles className="h-6 w-6 text-white" />
            </Button>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Super (↑)</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="default"
              size="lg"
              onClick={() => {
                const current = displayProfiles[currentIndex];
                if (current) {
                  handleConnect(current.user_id);
                  setCurrentIndex(prev => prev + 1);
                }
              }}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 border-0 shadow-lg hover:shadow-xl transition-all group"
            >
              <Heart className="h-6 w-6 text-white" />
            </Button>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Connect (→)</span>
          </div>
        </div>

        {/* Filters and Shortcuts */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground border-t border-white/10 pt-3 mt-3">
          <span>Show:</span>
          <select className="bg-card/60 backdrop-blur border border-border rounded px-2 py-1 text-[10px]">
            <option>All Members</option>
            <option>Active Now</option>
            <option>New This Week</option>
          </select>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Keyboard: ← Pass • → Connect • ↑ Super</span>
        </div>
      </div>
    </section>
  );
}
