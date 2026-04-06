import React, { useState, useEffect } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  PartyPopper,
  WifiOff,
  Check,
  CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { communityFetch } from "@/lib/community-gateway";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";

interface AutopilotPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutopilotPopup({ open, onOpenChange }: AutopilotPopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const { 
    allVisibleActions,
    pendingActions,
    selectedActions, 
    executeActions, 
    toggleActionSelection, 
    isExecuting,
    loading,
    error,
    fetchRecommendations,
  } = useAutopilot();
  
  const isMobile = useIsMobile();
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Fetch recommendations when popup opens (only if consent granted)
  useEffect(() => {
    if (open && hasConsent) {
      fetchRecommendations();
    } else if (open && !hasConsent) {
      setConsentDialogOpen(true);
    }
  }, [open, hasConsent, fetchRecommendations]);

  // Reset banner when popup closes
  useEffect(() => {
    if (!open) {
      setShowBanner(false);
      setBannerMessage(null);
    }
  }, [open]);

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

    const actionIds = selectedActions.map(a => a.id);
    
    try {
      const results = await executeActions(actionIds);
      
      // Check for navigate action — use the first navigate result
      const navigateResult = results.find(r => r.success && r.action_type === "navigate" && r.target);
      if (navigateResult) {
        onOpenChange(false);
        navigate(navigateResult.target!);
        return;
      }

      // For "notify" or default — show completion banner with message
      const notifyResult = results.find(r => r.success && r.completion_message);
      if (notifyResult) {
        setBannerMessage(notifyResult.completion_message!);
      }
      setShowBanner(true);
    } catch (err) {
      console.error("[Autopilot] execution error:", err);
    }
  };

  const handleNotNow = () => {
    onOpenChange(false);
  };

  const handleQuickJump = () => {
    onOpenChange(false);
    navigate("/dashboard/actions");
  };

  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleCompleteTask = async (actionId: string) => {
    setCompletingId(actionId);
    try {
      const res = await communityFetch(`/api/v1/autopilot/recommendations/${actionId}/complete`, { method: 'POST' });
      if (res.ok) {
        const { reward } = await res.json();
        if (reward) toast.success(`+${reward} VTN earned!`);
        fetchRecommendations();
      } else {
        toast.error("Could not complete task");
      }
    } catch {
      toast.error("Could not complete task");
    } finally {
      setCompletingId(null);
    }
  };

  const ActionItem = ({ action }: { action: AutopilotAction }) => {
    const isCompleted = action.status === "completed";
    const isProcessing = action.status === "executing";
    const isPending = action.status === "pending";

    return (
      <div 
        className={cn(
          "flex items-start space-x-3 p-3 rounded-lg border bg-card transition-all duration-300",
          isPending && "hover:bg-accent/50 cursor-pointer",
          isCompleted && "border-green-300 bg-green-50/50 dark:bg-green-900/10",
          isProcessing && "border-primary/30 bg-primary/5",
        )}
        onClick={() => isPending && toggleActionSelection(action.id)}
      >
        {/* Left side: checkbox, icon, or checkmark */}
        <div className="mt-1 flex-shrink-0">
          {isPending && (
            <Checkbox
              checked={action.selected}
              onCheckedChange={() => toggleActionSelection(action.id)}
              className="pointer-events-none"
            />
          )}
          {isProcessing && (
            <CircleDot className="w-4 h-4 text-primary" />
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
            )}>
              {action.title}
            </h4>
            <div className="flex items-center space-x-2">
              {isProcessing && (
                <Button
                  size="xs"
                  variant="default"
                  disabled={completingId === action.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCompleteTask(action.id);
                  }}
                >
                  {completingId === action.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>Complete ✓</>
                  )}
                </Button>
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

  // ── Confirmation Banner ──
  const renderBanner = () => (
    <div className="w-full rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 p-5 mb-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
          <Check className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Erledigt!
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bannerMessage || "Alle ausgewählten Aufgaben wurden erfolgreich abgeschlossen."}
          </p>
        </div>
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
    if (allVisibleActions.length === 0) return renderEmpty();

    return (
      <>
        {showBanner && renderBanner()}

        <ScrollArea className={cn(isMobile ? "flex-1" : "max-h-96")}>
          <div className="space-y-2">
            {allVisibleActions.map((action) => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        <ResponsiveDialogFooter className="flex-col space-y-3">
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
        </ResponsiveDialogFooter>
      </>
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className={cn(
        "sm:max-w-2xl sm:max-h-[80vh]",
        isMobile && "p-6 flex flex-col"
      )} fullscreenOnMobile>
        <ResponsiveDialogHeader className={isMobile ? "text-left border-b-0 px-0 pr-0 pt-0 pb-0" : undefined}>
          <ResponsiveDialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-400/20 to-orange-500/20 flex items-center justify-center">
              <Plane className="w-4 h-4 text-red-500" />
            </div>
            <span>{translate('autopilot.popup.title')}</span>
            {!loading && pendingActions.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {selectedActions.length} / {pendingActions.length}
              </Badge>
            )}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {loading
              ? "Checking for new suggestions…"
              : pendingActions.length > 0
                ? `${selectedActions.length} Vorschläge ausgewählt`
                : "Your autopilot recommendations"
            }
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {renderContent()}
      </ResponsiveDialogContent>
      <AIDataConsentDialog
        open={consentDialogOpen}
        onOpenChange={(isOpen) => {
          setConsentDialogOpen(isOpen);
          if (!isOpen && !hasConsent) onOpenChange(false);
        }}
        onConsent={grantConsent}
      />
    </ResponsiveDialog>
  );
}