import React, { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAutopilot } from "@/hooks/use-autopilot";
import { AutopilotAction, AutopilotPriority } from "@/types/autopilot";
import { 
  Plane,
  Zap, 
  Clock, 
  ChevronRight, 
  Settings, 
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  PartyPopper,
  WifiOff
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
    pendingActions, 
    selectedActions, 
    executeActions, 
    toggleActionSelection, 
    dismissActions,
    isExecuting,
    loading,
    error,
    fetchRecommendations,
  } = useAutopilot();
  
  const isMobile = useIsMobile();
  const [showOptions, setShowOptions] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);

  // Fetch recommendations when popup opens
  useEffect(() => {
    if (open) {
      fetchRecommendations();
    }
  }, [open, fetchRecommendations]);

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
    
    setExecutionProgress(0);
    const actionIds = selectedActions.map(a => a.id);
    
    const progressInterval = setInterval(() => {
      setExecutionProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
    
    try {
      const results = await executeActions(actionIds);
      const successCount = results.filter(r => r.success).length;
      
      toast({
        title: translate('autopilot.popup.toastExecutedTitle'),
        description: translate('autopilot.popup.toastExecutedDesc')
          .replace('{success}', String(successCount))
          .replace('{total}', String(results.length)),
      });
      
      onOpenChange(false);
      setShowOptions(false);
      setExecutionProgress(0);
    } catch (error) {
      toast({
        title: translate('autopilot.popup.toastFailedTitle'), 
        description: translate('autopilot.popup.toastFailedDesc'),
        variant: "destructive"
      });
    }
  };

  const handleNotNow = () => {
    onOpenChange(false);
    setShowOptions(false);
  };

  const handleQuickJump = () => {
    onOpenChange(false);
    navigate("/dashboard/actions");
  };

  const ActionItem = ({ action, showCheckbox = false }: { action: AutopilotAction; showCheckbox?: boolean }) => (
    <div className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {showCheckbox && (
        <Checkbox
          checked={action.selected}
          onCheckedChange={() => toggleActionSelection(action.id)}
          className="mt-1"
        />
      )}
      <div className="text-2xl">{action.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-sm">{action.title}</h4>
          <div className="flex items-center space-x-2">
            {action.timeEstimate && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {action.timeEstimate}
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn("text-xs border", getPriorityColor(action.priority))}
            >
              {getPriorityIcon(action.priority)}
              <span className="ml-1 capitalize">{translate(`autopilot.priorities.${action.priority}`)}</span>
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{action.reason}</p>
      </div>
    </div>
  );

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

  const renderContent = () => {
    if (loading) return renderLoading();
    if (error) return renderError();
    if (pendingActions.length === 0) return renderEmpty();

    return (
      <>
        <ScrollArea className={cn(isMobile ? "flex-1" : "max-h-96")}>
          <div className="space-y-2">
            {showOptions ? (
              pendingActions.map((action) => (
                <ActionItem key={action.id} action={action} showCheckbox={true} />
              ))
            ) : (
              selectedActions.slice(0, 6).map((action) => (
                <ActionItem key={action.id} action={action} />
              ))
            )}
            
            {!showOptions && selectedActions.length > 6 && (
              <div className="text-center py-3">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowOptions(true)}
                >
                  {translate('autopilot.popup.moreActions').replace('{count}', String(selectedActions.length - 6))}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
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
                disabled={selectedActions.length === 0}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
              >
                <Zap className="w-4 h-4 mr-2" />
                {translate('autopilot.popup.go').replace('{count}', String(selectedActions.length))}
              </Button>
              <Button variant="outline" onClick={handleNotNow}>
                {translate('autopilot.popup.notNow')}
              </Button>
              {!showOptions && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowOptions(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {translate('autopilot.popup.seeOptions')}
                </Button>
              )}
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
                {translate('autopilot.popup.selectedOf')
                  .replace('{selected}', String(selectedActions.length))
                  .replace('{total}', String(pendingActions.length))}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {loading 
              ? "Checking for new suggestions…"
              : pendingActions.length > 0
                ? translate('autopilot.popup.readyToExecute').replace('{count}', String(selectedActions.length))
                : "Your autopilot recommendations"
            }
          </DialogDescription>
        </DialogHeader>

        {isExecuting ? (
          <div className="py-8">
            <div className="text-center mb-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-400/20 to-orange-500/20 flex items-center justify-center">
                <Plane className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
              <h3 className="font-medium mb-2">{translate('autopilot.popup.executingTitle')}</h3>
              <p className="text-sm text-muted-foreground">{translate('autopilot.popup.executingDesc')}</p>
            </div>
            <Progress value={executionProgress} className="w-full" />
            <div className="text-center mt-2">
              <span className="text-sm text-muted-foreground">
                {translate('autopilot.popup.complete').replace('{percent}', String(executionProgress))}
              </span>
            </div>
          </div>
        ) : renderContent()}
      </DialogContent>
    </Dialog>
  );
}
