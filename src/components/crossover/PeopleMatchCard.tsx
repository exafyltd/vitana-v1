import { CrossoverCard } from "./CrossoverCard";
import { Users, Heart, MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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
  const [matches, setMatches] = useState<PeopleMatch[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div key={match.user_id} className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarImage src={match.avatar_url} />
              <AvatarFallback>{match.display_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate">{match.display_name}</p>
                <Badge variant="secondary" className="text-xs">{match.compatibility_score}%</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{match.match_reason}</p>
            </div>
            <MessageCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
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