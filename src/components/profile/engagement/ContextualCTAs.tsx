import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  UserPlus, 
  Calendar, 
  Heart, 
  Target,
  Users,
  Sparkles
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ContextualCTAsProps {
  isOwnProfile?: boolean;
  profileType?: 'coach' | 'user' | 'professional';
  hasActiveChallenge?: boolean;
  isServiceProvider?: boolean;
  compatibilityScore?: number;
  className?: string;
}

export function ContextualCTAs({ 
  isOwnProfile = false,
  profileType = 'user',
  hasActiveChallenge = false,
  isServiceProvider = false,
  compatibilityScore = 0,
  className 
}: ContextualCTAsProps) {
  // Don't show CTAs on own profile
  if (isOwnProfile) return null;

  const getSmartCTAs = () => {
    const ctas = [];

    // Primary connection CTA
    if (compatibilityScore >= 70) {
      ctas.push({
        label: "Connect",
        icon: <UserPlus className="h-4 w-4" />,
        variant: "default" as const,
        priority: 1,
        description: "High compatibility match"
      });
    } else {
      ctas.push({
        label: "Follow",
        icon: <Heart className="h-4 w-4" />,
        variant: "outline" as const,
        priority: 2
      });
    }

    // Challenge CTA
    if (hasActiveChallenge) {
      ctas.push({
        label: "Join Challenge",
        icon: <Target className="h-4 w-4" />,
        variant: "secondary" as const,
        priority: 1,
        badge: "Active"
      });
    }

    // Service provider CTAs
    if (isServiceProvider) {
      ctas.push({
        label: "Book Session",
        icon: <Calendar className="h-4 w-4" />,
        variant: "default" as const,
        priority: 1
      });
    }

    // Coach-specific CTAs
    if (profileType === 'coach') {
      ctas.push({
        label: "Start Coaching",
        icon: <Sparkles className="h-4 w-4" />,
        variant: "default" as const,
        priority: 1
      });
    }

    // Message CTA (always available)
    ctas.push({
      label: "Message",
      icon: <MessageCircle className="h-4 w-4" />,
      variant: "outline" as const,
      priority: 3
    });

    // Sort by priority and return top 3
    return ctas.sort((a, b) => a.priority - b.priority).slice(0, 3);
  };

  const smartCTAs = getSmartCTAs();

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Compatibility Badge */}
      {compatibilityScore >= 70 && (
        <div className="flex justify-center">
          <Badge 
            className="bg-gradient-to-r from-[hsl(var(--domain-community-accent))] to-[hsl(var(--pill-mental-accent))] text-white border-0"
          >
            <Users className="h-3 w-3 mr-1" />
            {compatibilityScore}% Compatible
          </Badge>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {smartCTAs.map((cta, index) => (
          <div key={index} className="relative">
            <Button 
              className="w-full justify-center gap-2" 
              variant={cta.variant}
              onClick={() => {
                console.log(`${cta.label} clicked`);
                // Handle CTA action
              }}
            >
              {cta.icon}
              {cta.label}
              {cta.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {cta.badge}
                </Badge>
              )}
            </Button>
            {cta.description && (
              <div className="text-xs text-muted-foreground text-center mt-1">
                {cta.description}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mutual Connections Hint */}
      {compatibilityScore >= 60 && (
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">
            {t('screens.profile.peopleLikeYouAlsoConnectedWith')}
          </div>
          <div className="flex justify-center -space-x-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center"
              >
                <Users className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs">+</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}