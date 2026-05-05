import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityHistoryItem } from "@/hooks/useActivityHistory";
import {
  ResponsiveConfirmDialog,
  ResponsiveConfirmDialogAction,
  ResponsiveConfirmDialogCancel,
  ResponsiveConfirmDialogContent,
  ResponsiveConfirmDialogDescription,
  ResponsiveConfirmDialogFooter,
  ResponsiveConfirmDialogHeader,
  ResponsiveConfirmDialogTitle,
  ResponsiveConfirmDialogTrigger,
} from "@/components/ui/responsive-confirm-dialog";
import { t } from '@/lib/i18n-toast';

interface ActivityCardProps {
  activity: ActivityHistoryItem;
  onPromote?: (activityId: string) => void;
  onDelete?: (activityId: string, type: 'activity') => void;
}

export function ActivityCard({ activity, onPromote, onDelete }: ActivityCardProps) {
  const canPromote = (activity.activityType === 'conversation' || activity.activityType === 'chat.message') 
    && activity.role === 'user';

  return (
    <Card className="border-border/50 hover:border-border transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${activity.tagColor?.split(' ')[0].replace('text-', 'bg-').replace('bg-bg-', 'bg-')}`}>
            <span className="text-lg">{activity.icon}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${activity.tagColor}`}>
                {activity.icon} {activity.metadata?.label || 'Activity'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {t('screens.memory.readonly')}
              </Badge>
            </div>

            <p className="text-sm text-foreground/90 mb-2 line-clamp-3">
              {activity.content}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canPromote && onPromote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => onPromote(activity.id)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t('screens.memory.saveAsKnowledge')}
                  </Button>
                )}
                
                {onDelete && (
                  <ResponsiveConfirmDialog>
                    <ResponsiveConfirmDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </ResponsiveConfirmDialogTrigger>
                    <ResponsiveConfirmDialogContent>
                      <ResponsiveConfirmDialogHeader>
                        <ResponsiveConfirmDialogTitle>{t('screens.memory.deleteActivity')}</ResponsiveConfirmDialogTitle>
                        <ResponsiveConfirmDialogDescription>
                          {t('screens.memory.youSureYouWantDeleteThis')}
                        </ResponsiveConfirmDialogDescription>
                      </ResponsiveConfirmDialogHeader>
                      <ResponsiveConfirmDialogFooter>
                        <ResponsiveConfirmDialogCancel>{t('screens.memory.cancel')}</ResponsiveConfirmDialogCancel>
                        <ResponsiveConfirmDialogAction
                          onClick={() => onDelete(activity.id, 'activity')}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >{t('screens.memory.delete')}
                        </ResponsiveConfirmDialogAction>
                      </ResponsiveConfirmDialogFooter>
                    </ResponsiveConfirmDialogContent>
                  </ResponsiveConfirmDialog>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
