import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Sparkles } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface SharedConnectionsCardProps {
  mutualConnections?: number;
  sharedGroups?: string[];
  commonInterests?: string[];
  aiSuggestion?: string;
  className?: string;
}

export function SharedConnectionsCard({
  mutualConnections = 5,
  sharedGroups = [],
  commonInterests = [],
  aiSuggestion,
  className
}: SharedConnectionsCardProps) {
  const defaultSharedGroups = sharedGroups.length > 0 ? sharedGroups : ['Mindful Living', 'Wellness Warriors'];
  const defaultCommonInterests = commonInterests.length > 0 ? commonInterests : ['Meditation', 'Yoga', 'Nutrition'];
  const defaultAISuggestion = aiSuggestion || "You both share a passion for holistic wellness and community building. Great potential for collaboration!";

  // Mock avatars for mutual connections
  const mutualAvatars = Array.from({ length: Math.min(mutualConnections, 4) }, (_, i) => ({
    id: i,
    name: `User ${i + 1}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
  }));

  return (
    <Card className={`rounded-2xl shadow-sm border-muted/40 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-[hsl(var(--domain-community-accent))]" />
          {t('screens.profile.sharedConnections')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mutual Connections */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {mutualConnections} mutual connections
          </p>
          <div className="flex -space-x-2">
            {mutualAvatars.map((avatar) => (
              <Avatar key={avatar.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={avatar.avatar} alt={avatar.name} />
                <AvatarFallback className="text-xs">U{avatar.id + 1}</AvatarFallback>
              </Avatar>
            ))}
            {mutualConnections > 4 && (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs font-medium">+{mutualConnections - 4}</span>
              </div>
            )}
          </div>
        </div>

        {/* Shared Groups */}
        {defaultSharedGroups.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('screens.profile.sharedGroups')}</p>
            <div className="flex flex-wrap gap-1">
              {defaultSharedGroups.map((group, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Common Interests */}
        {defaultCommonInterests.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('screens.profile.commonInterests')}</p>
            <div className="flex flex-wrap gap-1">
              {defaultCommonInterests.map((interest, index) => (
                <Badge 
                  key={index} 
                  className="text-xs bg-gradient-to-r from-[hsl(var(--pill-mental-accent))] to-[hsl(var(--pill-mental-accent)/0.7)] text-white border-0"
                >
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestion */}
        <div className="pt-2 border-t border-muted/30">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--pill-mental-accent))] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {defaultAISuggestion}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
