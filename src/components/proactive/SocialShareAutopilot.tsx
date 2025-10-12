import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { useSocialPlatforms } from "@/hooks/useSocialPlatforms";

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

  const handleAutoShare = (moment: ShareableMoment) => {
    toast({
      title: "Auto-Share Scheduled!",
      description: `Your post will be shared to ${moment.suggestedPlatforms.length} platforms at ${moment.optimalTime}`,
    });
  };

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
            Social Share Autopilot
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
          Automatically share your wellness journey when you hit milestones
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Educational benefit */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Grow 8x Faster with Auto-Sharing</p>
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
            <p className="text-sm font-medium mb-2">⚠️ No platforms connected</p>
            <Button variant="outline" size="sm" asChild>
              <a href="/sharing">Connect Social Media</a>
            </Button>
          </div>
        )}

        {/* Shareable moments */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Ready to Share
          </h4>
          
          {shareableMoments.map((moment) => (
            <div key={moment.id} className="p-4 rounded-lg border bg-card space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-2">
                    {moment.type}
                  </Badge>
                  <h5 className="font-medium mb-1">{moment.title}</h5>
                  <p className="text-xs text-muted-foreground">{moment.description}</p>
                </div>
              </div>

              <div className="p-3 rounded bg-muted/50 text-sm">
                {moment.generated_post}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>📊 Est. Reach: <strong>{moment.estimatedReach}+</strong></span>
                  <span>⏰ Best Time: <strong>{moment.optimalTime}</strong></span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAutoShare(moment)}
                  className="gap-2"
                  disabled={connectedPlatforms.length === 0}
                >
                  <Zap className="h-4 w-4" />
                  Auto-Share
                </Button>
                <Button size="sm" variant="outline">
                  Edit Post
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Growth stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">4.2x</div>
            <div className="text-xs text-muted-foreground">Avg Engagement Boost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">15min</div>
            <div className="text-xs text-muted-foreground">Time Saved Weekly</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
