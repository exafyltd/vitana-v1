import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, Calendar, Sparkles, Trophy } from "lucide-react";
import { useSocialPlatforms } from "@/hooks/useSocialPlatforms";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { notify, t } from '@/lib/i18n-toast';

interface ShareableMoment {
  id: string;
  type: 'achievement' | 'milestone' | 'event' | 'insight';
  title: string;
  description: string;
  suggestedPlatforms: string[];
  estimatedReach: number;
  optimalTime: string;
  generated_post: string;
}

export function SocialShareAutopilot() {
  const { connectedPlatforms } = useSocialPlatforms();
  const { toast } = useToast();
  const [autoShareEnabled, setAutoShareEnabled] = useState(false);

  // Mock shareable moments - in production, these would come from user activity
  const shareableMoments: ShareableMoment[] = [
    {
      id: '1',
      type: 'milestone',
      title: '7-Day Wellness Streak',
      description: 'Completed a full week of mindfulness practice',
      suggestedPlatforms: ['instagram', 'linkedin'],
      estimatedReach: 250,
      optimalTime: 'Today at 6:00 PM',
      generated_post: '🎉 Just completed my 7-day wellness streak on @Vitana! Feeling more mindful and energized than ever. Join me on this journey! 🧘‍♀️ #WellnessJourney #Mindfulness'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Community Helper Badge',
      description: 'Helped 10 community members this month',
      suggestedPlatforms: ['linkedin', 'twitter'],
      estimatedReach: 500,
      optimalTime: 'Tomorrow at 9:00 AM',
      generated_post: '🌟 Proud to have helped 10+ people in the Vitana wellness community this month! Together we\'re stronger. #CommunityFirst #WellnessSupport'
    }
  ];

  const handleAutoShare = (momentId: string) => {
    const moment = shareableMoments.find(m => m.id === momentId);
    if (moment) {
      notify('toasts.proactive.autoshareScheduled');
    }
  };

  const handleEditPost = (momentId: string) => {
    notify('toasts.proactive.editPost', 'toasts.proactive.postEditorComingSoon');
  };

  // Transform ShareableMoment to StandardHorizontalCardProps
  const transformedMoments = useMemo((): StandardHorizontalCardProps[] => {
    return shareableMoments.map((moment) => {
      // Map type to icon
      const iconMap = {
        milestone: Calendar,
        achievement: Trophy,
        event: Sparkles,
        insight: TrendingUp,
      };
      
      const IconComponent = iconMap[moment.type];

      return {
        id: moment.id,
        screenId: '/sharing',
        icon: <IconComponent className="h-5 w-5" />,
        title: moment.title,
        description: moment.description,
        badges: [{
          label: moment.type,
          variant: 'secondary' as const,
        }],
        metadata: [
          {
            icon: '📊',
            text: `Est. Reach: ${moment.estimatedReach}+`,
          },
          {
            icon: '⏰',
            text: `Best Time: ${moment.optimalTime}`,
          },
          {
            icon: '🌐',
            text: `Platforms: ${moment.suggestedPlatforms.join(', ')}`,
          },
        ],
        expandedContent: (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            {moment.generated_post}
          </div>
        ),
        primaryAction: {
          label: 'Auto-Share',
          onClick: () => handleAutoShare(moment.id),
          icon: <Zap className="h-4 w-4" />,
          disabled: connectedPlatforms.length === 0,
        },
        secondaryActions: [
          {
            label: 'Edit Post',
            onClick: () => handleEditPost(moment.id),
          },
        ],
      };
    });
  }, [shareableMoments, connectedPlatforms.length]);

  const toggleAutopilot = () => {
    setAutoShareEnabled(!autoShareEnabled);
    toast({
      title: autoShareEnabled ? "Autopilot Disabled" : "Autopilot Enabled",
      description: autoShareEnabled 
        ? "You'll need to manually approve shares" 
        : "We'll automatically share your wellness wins at optimal times"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('screens.proactive.socialShareAutopilot')}
          </div>
          <Button
            variant={autoShareEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleAutopilot}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {autoShareEnabled ? 'Enabled' : 'Enable'}
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('screens.proactive.automaticallyShareYourWellnessJourneyWhen')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Educational benefit */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">{t('screens.proactive.grow8xFasterWithAutosharing')}</p>
              <p className="text-xs text-muted-foreground">
                Members who auto-share their wellness wins inspire 5-10 friends to join each month, 
                creating a powerful ripple effect in their network.
              </p>
            </div>
          </div>
        </div>

        {/* Connected platforms status */}
        {connectedPlatforms.length === 0 && (
          <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-sm font-medium mb-2">{t('screens.proactive.noPlatformsConnected')}</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sharing">{t('screens.proactive.connectSocialMedia')}</Link>
            </Button>
          </div>
        )}

        {/* Shareable moments */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('screens.proactive.readyShare')}
          </h4>
          
          <HorizontalCardList
            items={transformedMoments}
            variant="standard"
            allowMultipleExpanded={true}
            listId="social-share-autopilot"
            screenId="/sharing"
          />
        </div>

        {/* Growth stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">4.2x</div>
            <div className="text-xs text-muted-foreground">{t('screens.proactive.avgEngagementBoost')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{t('screens.proactive.text15min')}</div>
            <div className="text-xs text-muted-foreground">{t('screens.proactive.timeSavedWeekly')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
