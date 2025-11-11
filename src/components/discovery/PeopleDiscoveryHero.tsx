import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardStack } from "./ProfileCardStack";
import { Button } from "@/components/ui/button";
import { Heart, X, Sparkles, Loader2, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProfilePreview } from "@/hooks/useProfilePreview";
import { useDemoMatches } from "@/hooks/useDemoMatches";
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

  // Use demo data if no real matches
  let displayProfiles = profiles && profiles.length > 0 
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

  // Apply filters
  if (interestFilter !== "all") {
    displayProfiles = displayProfiles.filter(p => 
      p.top_3_interests?.some(i => i.toLowerCase().includes(interestFilter.toLowerCase()))
    );
  }
  if (regionFilter !== "all") {
    displayProfiles = displayProfiles.filter(p => 
      p.location?.toLowerCase().includes(regionFilter.toLowerCase())
    );
  }

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

      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl">👋</span>
            <h2 className="text-4xl font-bold text-foreground">
              Meet Vitanians
            </h2>
          </div>
          <p className="text-lg text-muted-foreground">
            You have <span className="font-semibold text-accent">{totalCount - viewedCount} new matches</span> today
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </p>
          
          {/* Progress Bar with Gradient */}
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">Today's Discovery</span>
              <span className="font-bold text-foreground">{viewedCount}/{totalCount} viewed</span>
            </div>
            <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden backdrop-blur">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-500 ease-out rounded-full"
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

        {/* Large Expressive Action Buttons */}
        <div className="flex items-center justify-center gap-8 mt-8">
          {/* Pass Button */}
          <button
            onClick={() => {
              const current = displayProfiles[currentIndex];
              if (current) {
                handlePass(current.user_id);
                setCurrentIndex(prev => prev + 1);
              }
            }}
            className="group flex flex-col items-center gap-3 min-w-[120px] transition-all"
          >
            <div className="relative">
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-red-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Button body */}
              <div className="relative h-20 w-20 rounded-2xl bg-background/60 backdrop-blur-xl border border-border/40 hover:border-red-500/60 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-110">
                <X className="h-10 w-10 text-muted-foreground group-hover:text-red-500 transition-colors" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-base font-bold text-foreground group-hover:text-red-500 transition-colors">Pass</div>
              <div className="text-xs text-muted-foreground">← or Swipe Left</div>
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
            className="group flex flex-col items-center gap-3 min-w-[140px] transition-all"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur-2xl opacity-60 group-hover:opacity-100 animate-pulse" />
              
              <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-yellow-400/30 to-amber-500/30 backdrop-blur-xl border-2 border-yellow-500/50 hover:border-yellow-400 flex items-center justify-center transition-all duration-200 shadow-2xl group-hover:scale-110">
                <Sparkles className="h-12 w-12 text-yellow-500" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">Super Connect</div>
              <div className="text-xs text-muted-foreground">↑ or Swipe Up</div>
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
            className="group flex flex-col items-center gap-3 min-w-[120px] transition-all"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-green-400/30 to-emerald-500/30 backdrop-blur-xl border border-border/40 hover:border-green-500/60 flex items-center justify-center transition-all duration-200 shadow-xl group-hover:scale-110">
                <Heart className="h-10 w-10 text-green-500" />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-base font-bold text-green-600 dark:text-green-400">Connect</div>
              <div className="text-xs text-muted-foreground">→ or Swipe Right</div>
            </div>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filters:</span>
          </div>
          
          <Select value={interestFilter} onValueChange={setInterestFilter}>
            <SelectTrigger className="w-[160px] bg-background/60 backdrop-blur border-border/40">
              <SelectValue placeholder="Interests ▾" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Interests</SelectItem>
              <SelectItem value="yoga">Yoga</SelectItem>
              <SelectItem value="nutrition">Nutrition</SelectItem>
              <SelectItem value="biohacking">Biohacking</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="meditation">Meditation</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-[160px] bg-background/60 backdrop-blur border-border/40">
              <SelectValue placeholder="Region ▾" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="san francisco">San Francisco</SelectItem>
              <SelectItem value="los angeles">Los Angeles</SelectItem>
              <SelectItem value="new york">New York</SelectItem>
              <SelectItem value="austin">Austin</SelectItem>
              <SelectItem value="seattle">Seattle</SelectItem>
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
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Keyboard Hint */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          💡 <span className="font-medium">Keyboard shortcuts:</span> ← Pass • → Connect • ↑ Super Connect
        </p>
      </div>
    </div>
  );
}
