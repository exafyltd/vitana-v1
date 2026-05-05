import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Calendar, TrendingUp, Zap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import StandardHeader from '@/components/StandardHeader';
import { t } from '@/lib/i18n-toast';

export default function PersonalAITimeline() {
  const timelineItems = [
    {
      id: 1,
      time: '2 minutes ago',
      title: 'Autopilot executed 4 wellness actions',
      description: 'Successfully scheduled dance class, saved hydration reminder, and booked Dr. Chen follow-up',
      type: 'success',
      icon: Zap
    },
    {
      id: 2,
      time: '1 hour ago', 
      title: 'Health pattern detected',
      description: 'Your sleep quality improved 15% after meditation sessions. AI suggests continuing this routine.',
      type: 'insight',
      icon: TrendingUp
    },
    {
      id: 3,
      time: '3 hours ago',
      title: 'Community match found',
      description: 'Found 3 new longevity-focused groups that match 94% of your interests',
      type: 'recommendation',
      icon: Bot
    },
    {
      id: 4,
      time: 'This morning',
      title: 'Calendar optimization complete',
      description: 'Automatically blocked deep work hours based on your energy patterns',
      type: 'automation',
      icon: Calendar
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'insight': return 'bg-blue-500';
      case 'recommendation': return 'bg-purple-500';
      case 'automation': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <AppLayout>
      <SEO 
        title={t('screens.ai.personalAiTimelineVitana')} 
        description="Your personalized AI activity timeline and insights"
        canonical={window.location.href}
      />
      <div className="p-6 space-y-6">
        <StandardHeader
          title={t('screens.ai.personalAiTimeline')}
          description="Track your AI assistant's activities, insights, and recommendations"
          emoji="🤖"
        />

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                {t('screens.ai.aiActivityFeed')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {timelineItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={item.id} className="flex gap-4 p-4 rounded-lg border bg-card/50">
                      <div className={`w-10 h-10 rounded-full ${getTypeColor(item.type)} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{item.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {item.time}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Placeholder notice */}
          <Card className="mt-6 border-dashed">
            <CardContent className="p-6 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('screens.ai.aiIntelligenceHubPhase5')}</h3>
              <p className="text-muted-foreground">
                This is a read-only placeholder for the Personal AI Timeline. 
                Future phases will connect to real AI activity data and provide interactive insights.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}