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
          <div key={match.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors">
            <Avatar className="h-10 w-10">
              <AvatarImage src={match.avatar_url} />
              <AvatarFallback>{match.display_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{match.display_name}</p>
                <Badge variant="secondary" className="text-xs">{match.compatibility_score}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{match.match_reason}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleInteraction(match.user_id, 'pass')}
                disabled={interacting === match.user_id}
                className="h-8 w-8 p-0 hover:bg-destructive/10"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleInteraction(match.user_id, 'like')}
                disabled={interacting === match.user_id}
                className="h-8 w-8 p-0 hover:bg-primary/10"
              >
                <Heart className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </div>
          </div>
        ))
      )}

      <div className="mt-4 p-2 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Ready for connections</span>
          <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
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
      buttonText="Say Hi"
      onButtonClick={() => navigate('/messages/direct')}
      secondaryButtonText="Auto Intro"
      onSecondaryButtonClick={() => console.log("Auto intro activated")}
      className={className}
    />
  );
}

export const PeopleMatchCard = withCardId(PeopleMatchCardBase, "CT-CX-014", "C-014");