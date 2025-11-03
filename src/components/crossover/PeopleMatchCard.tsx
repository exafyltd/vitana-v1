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
  const [matches, setMatches] = useState<PeopleMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [interacting, setInteracting] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-recommendations', {
          body: { type: 'people', limit: 3 }
        });

        if (error) throw error;

        if (data?.recommendations) {
          setMatches(data.recommendations);
        }
      } catch (error) {
        console.error('Failed to fetch people recommendations:', error);
        // Use fallback data
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleInteraction = async (targetId: string, type: 'like' | 'pass') => {
    try {
      setInteracting(targetId);

      const { data, error } = await supabase.functions.invoke('process-match-interaction', {
        body: {
          target_id: targetId,
          target_type: 'user',
          interaction_type: type
        }
      });

      if (error) throw error;

      // Remove the match from the list
      setMatches(prev => prev.filter(m => m.user_id !== targetId));

      if (data.match_created) {
        toast({
          title: "🎉 It's a Match!",
          description: "You both liked each other. Start a conversation!",
          duration: 5000,
        });
      } else if (type === 'like') {
        toast({
          title: "👍 Liked",
          description: "They'll be notified if they like you back!",
        });
      }
    } catch (error) {
      console.error('Error processing interaction:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process interaction. Please try again.",
      });
    } finally {
      setInteracting(null);
    }
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
      {matches.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No matches available yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
        </div>
      ) : (
        matches.map((match) => (
          <div key={match.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.15)] hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all duration-300 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 to-fuchsia-500 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-400 to-fuchsia-400 rounded-full opacity-20 animate-pulse" />
              <Avatar className="h-12 w-12 relative ring-2 ring-pink-500/20 group-hover:ring-pink-500/50 transition-all duration-300">
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
              onClick={() => handleInteraction(match.user_id, 'like')}
              disabled={interacting === match.user_id}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              💬 Chat
            </Button>
          </div>
        ))
      )}

      <div className="mt-4 p-3 bg-gradient-to-r from-pink-500/10 to-fuchsia-500/10 rounded-2xl border border-pink-500/20">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Ready for meaningful connections</span>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
        </div>
      </div>
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