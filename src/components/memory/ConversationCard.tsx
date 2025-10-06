import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, User, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ConversationExchange } from "@/hooks/useActivityHistory";

interface ConversationCardProps {
  exchange: ConversationExchange;
  onPromote?: (exchangeId: string) => void;
}

export function ConversationCard({ exchange, onPromote }: ConversationCardProps) {
  return (
    <Card className="border-border/50 hover:border-border transition-colors group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            <span className="text-lg">💬</span>
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                💬 Conversation
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Read-only
              </Badge>
            </div>

            {/* User Message */}
            <div className="pl-3 border-l-2 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-r-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">You</span>
              </div>
              <p className="text-sm text-foreground/90 line-clamp-3">
                {exchange.userMessage.content}
              </p>
            </div>

            {/* AI Response */}
            {exchange.assistantMessage ? (
              <div className="pl-3 border-l-2 border-purple-500 dark:border-purple-400 bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Assistant</span>
                </div>
                <p className="text-sm text-foreground/90 line-clamp-3">
                  {exchange.assistantMessage.content}
                </p>
              </div>
            ) : (
              <div className="pl-3 border-l-2 border-muted bg-muted/20 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  Waiting for response...
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(exchange.createdAt), { addSuffix: true })}
                </span>
              </div>

              {onPromote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7"
                  onClick={() => onPromote(exchange.id)}
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
