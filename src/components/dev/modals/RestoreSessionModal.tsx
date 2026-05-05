import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Trash2 } from "lucide-react";
import { useSessionRestore } from "@/hooks/dev/useSessionRestore";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface RestoreSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestoreSessionModal({ open, onOpenChange }: RestoreSessionModalProps) {
  const { sessions, restoreSession, clearAllSessions } = useSessionRestore();

  const handleRestore = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    
    if (!session) {
      notifyError('toasts.dev.sessionNotFound');
      return;
    }

    // Check if we're already on the target path
    const isAlreadyOnPath = window.location.pathname === session.path;
    
    restoreSession(sessionId);
    onOpenChange(false);
    
    if (isAlreadyOnPath) {
      notifySuccess('toasts.dev.sessionRestoredSuccessfully');
    } else {
      notifySuccess('toasts.dev.restoringSession');
    }
  };

  const handleClearAll = () => {
    clearAllSessions();
    notifySuccess('toasts.dev.allSessionsCleared');
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 dark:border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5" />
            {t('screens.dev.restorePreviousSession')}
          </DialogTitle>
          <DialogDescription>
            {t('screens.dev.reopenYourLastWorkingContextRestore')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{t('screens.dev.noSavedSessionsFound')}</p>
              <p className="text-sm mt-2">{t('screens.dev.yourRecentSessionsWillAppearHere')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-xl bg-gradient-to-br from-white/50 to-white/30 dark:from-card/50 dark:to-card/30 border border-white/20 dark:border-white/10 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => handleRestore(session.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {new Date(session.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {' – '}
                          {new Date(session.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {session.tab} {session.subtab && `→ ${session.subtab}`}
                        </p>
                        {session.context && (
                          <p className="text-xs text-muted-foreground">
                            {session.context}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatDuration(session.duration)}</span>
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                          {t('screens.dev.saved')}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(session.id);
                      }}
                      className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {sessions.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('screens.dev.clearAllSessions')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
