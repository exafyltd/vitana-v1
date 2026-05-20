import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, User, Bot, Trash2 } from "lucide-react";
import type { ConversationExchange } from "@/hooks/useActivityHistory";
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

import { formatDistanceToNow } from '@/lib/locale-format';
interface ConversationCardProps {
  exchange: ConversationExchange;
  onPromote?: (exchangeId: string) => void;
  onDelete?: (exchangeId: string, type: 'conversation') => void;
}

export function ConversationCard({ exchange, onPromote, onDelete }: ConversationCardProps) {
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
                {t('screens.memory.conversation')}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {t('screens.memory.readonly')}
              </Badge>
            </div>

            {/* User Message */}
            <div className="pl-3 border-l-2 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-r-lg">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('screens.memory.you')}</span>
                {exchange.userMessage.metadata?.inputMethod === 'voice' && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    {t('screens.memory.voice2')}
                  </Badge>
                )}
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
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{t('screens.memory.aiAssistant')}</span>
                </div>
                <p className="text-sm text-foreground/90 line-clamp-3">
                  {exchange.assistantMessage.content}
                </p>
              </div>
            ) : (
              <div className="pl-3 border-l-2 border-muted bg-muted/20 p-3 rounded-r-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{t('screens.memory.aiAssistant')}</span>
                </div>
                <p className="text-sm text-muted-foreground italic">
                  {t('screens.memory.waitingForResponse')}
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

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onPromote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => onPromote(exchange.id)}
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
                        <ResponsiveConfirmDialogTitle>{t('screens.memory.deleteConversation')}</ResponsiveConfirmDialogTitle>
                        <ResponsiveConfirmDialogDescription>{t('screens.memory.youSureYouWantDeleteThis')}
                        </ResponsiveConfirmDialogDescription>
                      </ResponsiveConfirmDialogHeader>
                      <ResponsiveConfirmDialogFooter>
                        <ResponsiveConfirmDialogCancel>{t('screens.memory.cancel')}</ResponsiveConfirmDialogCancel>
                        <ResponsiveConfirmDialogAction
                          onClick={() => onDelete(exchange.id, 'conversation')}
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
