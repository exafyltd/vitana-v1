import { CrossoverCard } from "./CrossoverCard";
import { Users2, MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useDemoMatches } from "@/hooks/useDemoMatches";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { groups: demoGroups } = useDemoMatches();
  const [groups, setGroups] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Fetch group recommendations with group details
        const { data, error } = await supabase
          .from('group_recommendations')
          .select(`
            match_score,
            match_reasons,
            global_community_groups (
              id,
              name,
              description,
              category,
              member_count
            )
          `)
          .eq('is_dismissed', false)
          .gte('match_score', 0.5)
          .order('match_score', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped = data
            .filter(r => r.global_community_groups)
            .map(r => ({
              id: r.global_community_groups.id,
              name: r.global_community_groups.name,
              description: r.global_community_groups.description || '',
              category: r.global_community_groups.category || 'general',
              member_count: r.global_community_groups.member_count,
              compatibility_score: Math.round(r.match_score * 100),
              match_reason: Array.isArray(r.match_reasons) && r.match_reasons.length > 0
                ? (r.match_reasons as string[])[0]
                : 'Great match for you'
            }));
          setGroups(mapped);
        } else {
          // Use demo data as fallback
          setGroups(demoGroups);
        }
      } catch (error) {
        console.error('Failed to fetch group recommendations:', error);
        setGroups(demoGroups);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [demoGroups]);

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

  const handleJoinGroup = (group: GroupMatch) => {
    if (group.id.startsWith('demo-')) {
      toast({
        title: "✓ Joined",
        description: `You're now part of ${group.name}!`,
        duration: 3000,
      });
      return;
    }
    navigate(`/community/groups/${group.id}`);
  };

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Communities that match your vibe.
      </p>
      
      {groups.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((group) => (
              <div 
                key={group.id} 
                className="p-4 rounded-2xl bg-card/70 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(236,72,153,0.1)] hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] transition-all duration-300 cursor-pointer"
                onClick={() => handleJoinGroup(group)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-sm leading-tight">{group.name}</h4>
                  <Badge className="text-xs bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0">
                    {group.compatibility_score}%
                  </Badge>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="capitalize">{group.category}</span>
                  </div>
                  <p className="line-clamp-2">{group.match_reason}</p>
                  <p className="font-medium text-foreground">{group.member_count} members</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">Perfect for your interests</span>
              <div className="w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
            </div>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => navigate('/community/groups?recommended=1')}
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