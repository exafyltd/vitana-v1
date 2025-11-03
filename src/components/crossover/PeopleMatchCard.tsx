import { CrossoverCard } from "./CrossoverCard";
import { Users, Heart, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { SkeletonCard } from "@/components/ui/skeleton-card";

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

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-recommendations', {
          body: { type: 'people', limit: 6 }
        });

        if (error) throw error;

        if (data?.recommendations && data.recommendations.length > 0) {
          setMatches(data.recommendations);
        } else {
          // Use demo data as fallback
          setMatches(demoPeople);
        }
      } catch (error) {
        console.error('Failed to fetch people recommendations:', error);
        // Use demo data as fallback
        setMatches(demoPeople);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [demoPeople]);

  const handleChatClick = (match: PeopleMatch) => {
    // Check if it's a demo user
    if (match.user_id.startsWith('demo-')) {
      toast({
        title: "💬 Chat started",
        description: `Opening conversation with ${match.display_name}...`,
        duration: 3000,
      });
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
        title="Top People 👋"
        subtitle="Finding your perfect matches..."
        content={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
        buttonText="Say Hi"
        onButtonClick={() => {}}
        className={className}
      />
    );
  }

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Suggested based on your profile & recent activity.
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
                <Avatar className={`h-12 w-12 relative transition-all duration-300 ${getAvatarRingColor(match.compatibility_score)}`}>
                  <AvatarImage src={match.avatar_url} />
                  <AvatarFallback>{match.display_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{match.display_name}</p>
                  <Badge className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0">{match.compatibility_score}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{match.match_reason}</p>
              </div>
              <Button
                size="sm"
                onClick={() => handleChatClick(match)}
                className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                💬 Chat
              </Button>
            </div>
          ))}
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">Ready for meaningful connections</span>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/community/people?recommended=1')}
              className="text-xs text-primary"
            >
              See more →
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
      title="Top People 👋"
      subtitle="High compatibility matches"
      content={content}
      buttonText="💬 Start Chat"
      onButtonClick={() => navigate('/messages/direct')}
      secondaryButtonText="Auto Intro"
      onSecondaryButtonClick={() => console.log("Auto intro activated")}
      className={className}
    />
  );
}

export const PeopleMatchCard = withCardId(PeopleMatchCardBase, "CT-CX-014", "C-014");