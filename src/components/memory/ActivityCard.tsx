import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityHistoryItem } from "@/hooks/useActivityHistory";

interface ActivityCardProps {
  activity: ActivityHistoryItem;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                Conversation
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Read-only
              </Badge>
            </div>

            <p className="text-sm text-foreground/90 mb-2 line-clamp-3">
              {activity.content}
            </p>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
