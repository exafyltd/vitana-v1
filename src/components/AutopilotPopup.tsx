import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotAction, AutopilotPriority } from "@/types/autopilot";
import { 
  Plane,
  Zap, 
  Clock, 
  ChevronRight, 
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  PartyPopper,
  WifiOff,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useIsMobile } from "@/hooks/use-mobile";

interface AutopilotPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutopilotPopup({ open, onOpenChange }: AutopilotPopupProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const { 
    allVisibleActions,
    pendingActions,
    selectedActions, 
    executeActions, 
    toggleActionSelection, 
    setActionStatus,
    isExecuting,
    loading,
    error,
    fetchRecommendations,
    fetchCount,
  } = useAutopilot();
  
  const isMobile = useIsMobile();
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());

  // Fetch recommendations when popup opens
  useEffect(() => {
    if (open) {
      fetchRecommendations();
      setFadingOut(new Set());
    }
  }, [open, fetchRecommendations]);

  // Fade out completed items after 1.5s
  useEffect(() => {
    const completed = allVisibleActions.filter(a => a.status === "completed");
    completed.forEach(action => {
      if (!fadingOut.has(action.id)) {
        setTimeout(() => {
          setFadingOut(prev => new Set(prev).add(action.id));
        }, 1500);
      }
    });
  }, [allVisibleActions, fadingOut]);

  const getPriorityColor = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return "text-red-500 bg-red-50 border-red-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      case "low": return "text-green-600 bg-green-50 border-green-200";
    }
  };

  const getPriorityIcon = (priority: AutopilotPriority) => {
    switch (priority) {
      case "high": return <AlertTriangle className="w-3 h-3" />;
      case "medium": return <Info className="w-3 h-3" />;
      case "low": return <CheckCircle className="w-3 h-3" />;
    }
  };

  const handleExecute = async () => {
    if (selectedActions.length === 0) return;
    
    // Show confirmation
    toast({
      title: "Super, ich kümmere mich darum!",
    });

    const actionIds = selectedActions.map(a => a.id);
    
    try {
      const results = await executeActions(actionIds);
      const successCount = results.filter(r => r.success).length;
      
      if (successCount < results.length) {
        toast({
          title: "Teilweise abgeschlossen",
          description: `${successCount} von ${results.length} erfolgreich aktiviert.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: translate('autopilot.popup.toastFailedTitle'), 
        description: translate('autopilot.popup.toastFailedDesc'),
        variant: "destructive"
      });
    }
  };

  const handleNotNow = () => {
    // Just close — don't reject or dismiss anything
    onOpenChange(false);
  };

  const handleQuickJump = () => {
    onOpenChange(false);
    navigate("/dashboard/actions");
  };

  const ActionItem = ({ action }: { action: AutopilotAction }) => {
    const isCompleted = action.status === "completed";
    const isProcessing = action.status === "executing";
    const isPending = action.status === "pending";
    const isFading = fadingOut.has(action.id);

    return (
      <div 
        className={cn(
          "flex items-start space-x-3 p-3 rounded-lg border bg-card transition-all duration-500 cursor-pointer",
          isPending && "hover:bg-accent/50",
          isCompleted && "border-green-300 bg-green-50/50 dark:bg-green-900/10",
          isProcessing && "border-primary/30 bg-primary/5",
          isFading && "opacity-0 max-h-0 p-0 m-0 overflow-hidden border-0"
        )}
        onClick={() => isPending && toggleActionSelection(action.id)}
      >
        {/* Left side: checkbox, spinner, or checkmark */}
        <div className="mt-1 flex-shrink-0">
          {isPending && (
            <Checkbox
              checked={action.selected}
              onCheckedChange={() => toggleActionSelection(action.id)}
              className="pointer-events-none"
            />
          )}
          {isProcessing && (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
          {isCompleted && (
            <Check className="w-4 h-4 text-green-600" />
          )}
        </div>

        <div className="text-2xl flex-shrink-0">{action.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn(
              "font-medium text-sm",
              isCompleted && "text-green-700 dark:text-green-400",
              isProcessing && "text-muted-foreground"
            )}>
              {action.title}
            </h4>
            <div className="flex items-center space-x-2">
              {isProcessing && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  In Bearbeitung…
                </Badge>
              )}
              {isCompleted && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                  <Check className="w-3 h-3 mr-1" />
                  Erledigt
                </Badge>
              )}
              {isPending && action.timeEstimate && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {action.timeEstimate}
                </Badge>
              )}
              {isPending && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs border", getPriorityColor(action.priority))}
                >
                  {getPriorityIcon(action.priority)}
                  <span className="ml-1 capitalize">{translate(`autopilot.priorities.${action.priority}`)}</span>
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{action.reason}</p>
        </div>
      </div>
    );
  };

  // ── Loading state ──
  const renderLoading = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <p className="text-sm text-muted-foreground">Loading recommendations…</p>
    </div>
  );

  // ── Error state ──
  const renderError = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <WifiOff className="w-10 h-10 text-destructive mb-4" />
      <p className="text-sm font-medium mb-1">Could not load recommendations</p>
      <p className="text-xs text-muted-foreground mb-4">{error}</p>
      <Button size="sm" variant="outline" onClick={() => fetchRecommendations()}>
        Try Again
      </Button>
    </div>
  );

  // ── Empty state ──
  const renderEmpty = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <PartyPopper className="w-10 h-10 text-primary mb-4" />
      <p className="text-sm font-medium mb-1">All caught up!</p>
      <p className="text-xs text-muted-foreground">No new recommendations right now. Check back later.</p>
    </div>
  );

  // Filter out fully faded items for display
  const visibleItems = allVisibleActions.filter(a => !fadingOut.has(a.id));

  const renderContent = () => {
    if (loading) return renderLoading();
    if (error) return renderError();
    if (allVisibleActions.length === 0) return renderEmpty();

    return (
      <>
        <ScrollArea className={cn(isMobile ? "flex-1" : "max-h-96")}>
          <div className="space-y-2">
            {visibleItems.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter className="flex-col space-y-3">
          <div className={cn(
            "w-full",
            isMobile 
              ? "flex flex-col gap-2" 
              : "flex items-center justify-between"
          )}>
            <div className={cn(isMobile ? "flex flex-col gap-2" : "flex space-x-2")}>
              <Button
                onClick={handleExecute}
                disabled={selectedActions.length === 0 || isExecuting}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                GO ({selectedActions.length})
              </Button>
              <Button variant="outline" onClick={handleNotNow}>
                {translate('autopilot.popup.notNow')}
              </Button>
            </div>
            
            <Button
              variant="link"
              onClick={handleQuickJump}
              className="text-sm text-muted-foreground p-0 h-auto"
            >
              {translate('autopilot.popup.seeAllInAI')}
            </Button>
          </div>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        isMobile 
          ? "w-full h-[100dvh] max-w-full max-h-full rounded-none flex flex-col" 
          : "max-w-2xl max-h-[80vh]"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400/20 to-orange-500/20 flex items-center justify-center">
              <Plane className="w-4 h-4 text-red-500" />
            </div>
            <span>{translate('autopilot.popup.title')}</span>
            {!loading && pendingActions.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {selectedActions.length} / {pendingActions.length}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {loading 
              ? "Checking for new suggestions…"
              : pendingActions.length > 0
                ? `${selectedActions.length} Vorschläge ausgewählt`
                : "Your autopilot recommendations"
            }
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
