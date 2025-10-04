import { CrossoverCard } from "./CrossoverCard";
import { Users2, MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface GroupMatch {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  compatibility_score: number;
  match_reason: string;
}

interface GroupMatchCardProps {
  className?: string;
}

function GroupMatchCardBase({ className }: GroupMatchCardProps) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-recommendations', {
          body: { type: 'groups', limit: 3 }
        });

        if (error) throw error;

        if (data?.recommendations) {
          setGroups(data.recommendations);
        }
      } catch (error) {
        console.error('Failed to fetch group recommendations:', error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <CrossoverCard
        icon={Users2}
        category="mental"
        title="Groups & Events 🎉"
        subtitle="Finding perfect communities..."
        content={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        }
        buttonText="Join Group"
        onButtonClick={() => {}}
        className={className}
      />
    );
  }

  const content = (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">No groups available yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon!</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="p-2 bg-secondary/20 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm leading-tight">{group.name}</h4>
              <Badge variant="default" className="text-xs">
                {group.compatibility_score}%
              </Badge>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="capitalize">{group.category}</span>
              </div>
              <p className="truncate">{group.match_reason}</p>
              <p>{group.member_count} members</p>
            </div>
          </div>
        ))
      )}

      <div className="mt-4 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Perfect for your interests</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <CrossoverCard
      icon={Users2}
      category="mental"
      title="Groups & Events 🎉"
      subtitle="Join communities that match your vibe"
      content={content}
      buttonText="Join Group"
      onButtonClick={() => navigate('/community/groups')}
      secondaryButtonText="Auto RSVP"
      onSecondaryButtonClick={() => console.log("Auto RSVP activated")}
      className={className}
    />
  );
}

export const GroupMatchCard = withCardId(GroupMatchCardBase, "CT-CX-015", "C-015");