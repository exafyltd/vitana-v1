import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityHistoryItem } from "@/hooks/useActivityHistory";

interface ActivityCardProps {
  activity: ActivityHistoryItem;
  onPromote?: (activityId: string) => void;
}

export function ActivityCard({ activity, onPromote }: ActivityCardProps) {
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
                {activity.icon} {activity.activityType === 'conversation' ? 'Conversation' : activity.tagColor?.split(' ').slice(-1)[0]}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Read-only
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

              {canPromote && onPromote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7"
                  onClick={() => onPromote(activity.id)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Save as Knowledge
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
