import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, ArrowRight, Sparkles } from "lucide-react";
import { useProfileProgress } from "@/hooks/useProfileProgress";
import { UserProfile } from "@/types/profile";
import { t } from '@/lib/i18n-toast';

interface ProfileProgressCardProps {
  profile: UserProfile;
  onSectionClick: (sectionId: string) => void;
  className?: string;
}

export function ProfileProgressCard({ 
  profile, 
  onSectionClick,
  className 
}: ProfileProgressCardProps) {
  const { 
    sections, 
    completionPercentage, 
    nextSuggestion,
    isComplete 
  } = useProfileProgress(profile);

  return (
    <Card className={`rounded-xl shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-[hsl(var(--util-profile-accent))]" />
          {t('screens.profile.profileCompletion')}
          <Badge 
            variant={isComplete ? "default" : "secondary"}
            className="ml-auto"
          >
            {completionPercentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress 
            value={completionPercentage} 
            className="h-2"
          />
          <div className="text-sm text-muted-foreground">
            {isComplete 
              ? "🎉 Your profile is complete!" 
              : `${sections.filter(s => s.completed).length} of ${sections.length} sections completed`
            }
          </div>
        </div>

        {nextSuggestion && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-[hsl(var(--util-profile-accent)/0.1)] to-[hsl(var(--domain-community-accent)/0.1)] border">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium text-sm">{t('screens.profile.nextName', { name: nextSuggestion.name })}</div>
                <div className="text-xs text-muted-foreground">
                  {nextSuggestion.description}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onSectionClick(nextSuggestion.id)}
                className="shrink-0"
              >
                {t('screens.profile.complete')}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('screens.profile.sections')}</div>
          <div className="grid grid-cols-2 gap-2">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSectionClick(section.id)}
              >
                {section.completed ? (
                  <CheckCircle className="h-4 w-4 text-[hsl(var(--domain-community-accent))]" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-xs ${section.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {section.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}