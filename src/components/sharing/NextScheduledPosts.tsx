import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Pause, Play, MoreVertical, Loader2, X } from "lucide-react";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { HorizontalCardList } from "@/components/ui/horizontal-card-list";
import { StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { t } from '@/lib/i18n-toast';

import { fmtDate, fmtTime } from '@/lib/locale-format';
export function NextScheduledPosts() {
  const { scheduledPosts, isLoading, pauseScheduled, resumeScheduled, cancelScheduled } = useScheduledPosts();
  
  const handlePause = (id: string) => {
    pauseScheduled.mutate(id);
  };
  
  const handleResume = (id: string) => {
    resumeScheduled.mutate(id);
  };
  
  const handleCancel = (id: string) => {
    cancelScheduled.mutate(id);
  };

  // Transform scheduled posts to StandardHorizontalCard format
  const transformedCards: StandardHorizontalCardProps[] = (scheduledPosts || []).map((scheduled: any) => {
    const post = scheduled.distribution_posts;
    const scheduledDate = new Date(scheduled.scheduled_for);
    const isPaused = scheduled.status === "paused";
    
    return {
      id: scheduled.id,
      screenId: 'sharing-scheduled-posts',
      icon: <Calendar className="w-5 h-5" />,
      title: post?.title || "Untitled Post",
      description: post?.description || post?.content || "No description available",
      badges: isPaused ? [
        {
          label: 'Paused',
          variant: 'outline' as const,
        }
      ] : [],
      metadata: [
        {
          icon: <Calendar className="w-3.5 h-3.5" />,
          text: `${fmtDate(scheduledDate)} at ${fmtTime(scheduledDate, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}`,
        }
      ],
      secondaryActions: [
        {
          label: isPaused ? 'Resume' : 'Pause',
          onClick: () => isPaused ? handleResume(scheduled.id) : handlePause(scheduled.id),
          icon: isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />,
        },
        {
          label: 'Cancel',
          onClick: () => handleCancel(scheduled.id),
          icon: <X className="w-4 h-4 mr-2" />,
        }
      ],
      expandedContent: scheduled.channels && scheduled.channels.length > 0 ? (
        <div className="flex flex-wrap gap-1 py-2">
          {scheduled.channels.map((channel: string, idx: number) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {channel}
            </Badge>
          ))}
        </div>
      ) : undefined,
    };
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t('screens.sharing.automationQueue')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('screens.sharing.nextScheduledPosts')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <HorizontalCardList
            items={transformedCards}
            variant="standard"
            screenId="sharing-scheduled-posts"
            groupBy="none"
            gap="md"
            emptyState={
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">{t('screens.sharing.noScheduledPostsYet')}</p>
              </div>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
