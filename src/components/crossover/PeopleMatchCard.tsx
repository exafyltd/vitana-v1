import { CrossoverCard } from "./CrossoverCard";
import { Users, Heart, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { notify, t } from '@/lib/i18n-toast';
import { localizeMatchReason } from '@/lib/matchReason';

interface PeopleMatch {
  user_id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  compatibility_score: number;
  match_reason: string;
}

interface PeopleMatchCardProps {
  className?: string;
}

function PeopleMatchCardBase({ className }: PeopleMatchCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { people: demoPeople } = useDemoMatches();
  const [matches, setMatches] = useState<PeopleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [interacting, setInteracting] = useState<string | null>(null);

  const getMatchReason = (index: number): string => {
    const reasons = [
      "Morning routine & wellness goals align",
      "Similar activity patterns & interests",
      "Shared fitness & mindfulness journey",
      "Compatible lifestyle & schedule",
      "Overlapping health goals",
      "Mutual wellness interests"
    ];
    return reasons[index % reasons.length];
  };

  const fetchRealProfilesWithScores = async () => {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    // Build query
    let query = supabase
      .from('profiles')
      .select('user_id, display_name, handle, avatar_url, bio')
      .not('avatar_url', 'is', null)
      .limit(6);
    
    // Exclude current user if logged in
    if (currentUserId) {
      query = query.neq('user_id', currentUserId);
    }
    
    const { data: profiles, error } = await query;
    
    if (error || !profiles || profiles.length === 0) {
      return null;
    }
    
    return profiles.map((profile, index) => ({
      user_id: profile.user_id,
      display_name: profile.display_name || profile.handle || t('screens.crossover.communityMember'),
      avatar_url: profile.avatar_url,
      bio: profile.bio || t('screens.crossover.vitanaCommunityMember'),
      compatibility_score: 85 - (index * 3),
      match_reason: getMatchReason(index)
    }));
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // TIER 1: Try edge function
        const { data, error } = await supabase.functions.invoke('generate-recommendations', {
          body: { type: 'people', limit: 6 }
        });

        if (!error && data?.recommendations && data.recommendations.length > 0) {
          console.log("✅ Using edge function recommendations");
          setMatches(data.recommendations);
          setLoading(false);
          return;
        }

        // TIER 2: Fetch real profiles with synthetic scores
        console.log("⚠️ Edge function failed, fetching real profiles...");
        const realProfiles = await fetchRealProfilesWithScores();
        
        if (realProfiles && realProfiles.length > 0) {
          console.log("✅ Using real profiles with synthetic scores:", realProfiles.length);
          setMatches(realProfiles);
          setLoading(false);
          return;
        }

        // TIER 3: Use demo data as last resort
        console.log("ℹ️ No real profiles found, using demo data");
        setMatches(demoPeople);
        
      } catch (error) {
        console.error('Failed to fetch people recommendations:', error);
        
        // Try real profiles on exception
        const realProfiles = await fetchRealProfilesWithScores();
        if (realProfiles && realProfiles.length > 0) {
          setMatches(realProfiles);
        } else {
          setMatches(demoPeople);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []); // Only fetch once on mount

  const handleChatClick = (match: PeopleMatch) => {
    // Check if it's a demo user (DiceBear avatar URLs or demo- prefix)
    if (match.user_id.startsWith('demo-') || match.avatar_url?.includes('dicebear.com')) {
      notify('toasts.crossover.chatStarted');
      return;
    }
    
    // Real user - navigate to actual chat
    navigate(`/messages/direct?user=${match.user_id}`);
  };

  const getAvatarRingColor = (score: number) => {
    return score >= 80 
      ? "ring-2 ring-green-400/30 group-hover:ring-green-400/60 group-hover:shadow-[0_0_20px_rgba(74,222,128,0.4)]" 
      : "ring-2 ring-amber-400/30 group-hover:ring-pink-400/60 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]";
  };

  if (loading) {
    return (
      <CrossoverCard
        icon={Users}
        category="mental"
        title={t('screens.crossover.topPeople')}
        subtitle={t('screens.crossover.findingMatches')}
        content={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
        buttonText={t('screens.crossover.sayHi')}
        onButtonClick={() => {}}
        className={className}
      />
    );
  }

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('screens.crossover.suggestedBasedYourProfileRecentActivity')}
      </p>
      
      {matches.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {matches.map((match) => (
            <div key={match.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all duration-300 group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
                <ClickableAvatar
                  userId={match.user_id}
                  src={match.avatar_url}
                  fallback={match.display_name.split(' ').map(n => n[0]).join('')}
                  alt={match.display_name}
                  className={`h-12 w-12 relative transition-all duration-300 ${getAvatarRingColor(match.compatibility_score)}`}
                  disabled={match.user_id.startsWith('demo-') || match.avatar_url?.includes('dicebear.com')}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{match.display_name}</p>
                  <Badge className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0">{match.compatibility_score}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{localizeMatchReason(match.match_reason)}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleChatClick(match)}
                className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >{t('screens.crossover.chat')}
              </Button>
            </div>
          ))}
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">{t('screens.crossover.readyForMeaningfulConnections')}</span>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/community/people?recommended=1')}
              className="text-xs text-primary"
            >
              {t('screens.crossover.seeMore')}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <CrossoverCard
      icon={Users}
      category="mental"
      title={t('screens.crossover.topPeople')}
      subtitle={t('screens.crossover.highCompatibilityMatches')}
      content={content}
      buttonText={t('screens.crossover.startChat')}
      onButtonClick={() => navigate('/messages/direct')}
      secondaryButtonText={t('screens.crossover.autoIntro')}
      onSecondaryButtonClick={() => console.log("Auto intro activated")}
      className={className}
    />
  );
}

export const PeopleMatchCard = withCardId(PeopleMatchCardBase, "CT-CX-014", "C-014");
