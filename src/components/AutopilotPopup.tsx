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
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAIConsent } from "@/hooks/useAIConsent";
import { AIDataConsentDialog } from "@/components/ai/AIDataConsentDialog";
import { PillarDeltaBadges } from "@/components/health/PillarDeltaBadges";
import { useVitanaIndexCache } from "@/components/health/VitanaIndexProvider";
import { EMPTY_COPY } from "@/lib/celebrate";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";
import { notifyError, t } from '@/lib/i18n-toast';

interface AutopilotPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PILLAR_LABEL: Record<VitanaPillarKey, string> = {
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
  mental: "Mental",
};

const PILLAR_EMOJI: Record<VitanaPillarKey, string> = {
  nutrition: "🥗",
  hydration: "💧",
  exercise: "💪",
  sleep: "😴",
  mental: "🧠",
};

function dominantPillar(vector: ContributionVector | null | undefined): VitanaPillarKey | null {
  if (!vector) return null;
  let bestKey: VitanaPillarKey | null = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === "number" && v > bestVal) {
      bestKey = k;
      bestVal = v;
    }
  }
  return bestKey;
}

function sumVectorTotal(vector: ContributionVector | null | undefined): number {
  if (!vector) return 0;
  return Object.values(vector).reduce<number>(
    (acc, v) => acc + (typeof v === "number" && v > 0 ? v : 0),
    0,
  );
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
    completeRecommendation,
  } = useAutopilot();
  
  const isMobile = useIsMobile();
  const { hasConsent, dialogOpen: consentDialogOpen, setDialogOpen: setConsentDialogOpen, grantConsent } = useAIConsent();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const { index: vitanaIndex } = useVitanaIndexCache();
  const currentTotal = vitanaIndex?.total ?? null;
  const pillarScores = vitanaIndex?.pillars ?? null;

  const selectedLift = selectedActions.reduce(
    (acc, a) => acc + sumVectorTotal(a.contributionVector),
    0,
  );

  // Group visible actions by dominant pillar; render group headers only when
  // ≥2 groups exist (single-group case stays visually flat).
  const groupedActions = (() => {
    const groups = new Map<VitanaPillarKey | "_unassigned", AutopilotAction[]>();
    for (const action of allVisibleActions) {
      const pillar = dominantPillar(action.contributionVector);
      const key = pillar ?? "_unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(action);
    }
    // Sort by ascending pillar score (most under-served first); _unassigned last.
    const ordered = Array.from(groups.entries())
      .filter(([k]) => k !== "_unassigned")
      .sort(([a], [b]) => {
        const av = pillarScores?.[a as VitanaPillarKey] ?? 0;
        const bv = pillarScores?.[b as VitanaPillarKey] ?? 0;
        return av - bv;
      }) as Array<[VitanaPillarKey, AutopilotAction[]]>;
    const unassigned = groups.get("_unassigned");
    if (unassigned && unassigned.length > 0) {
      ordered.push(["_unassigned" as unknown as VitanaPillarKey, unassigned]);
    }
    return ordered;
  })();

  const showGroupHeaders = groupedActions.length >= 2;

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
        // Overlay targets (life_compass, calendar, invite, index) don't change
        // routes — opening the overlay IS the action being taken, so flush
        // the recommendation to completed instead of leaving it stuck at
        // activated waiting for a source_ref handler that doesn't exist.
        try {
          const parsed = new URL(navigateResult.target!, window.location.origin);
          const openTarget = parsed.searchParams.get("open");
          const overlayEvent =
            openTarget === "life_compass" || openTarget === "goals" ? "vitana:open-life-compass" :
            openTarget === "calendar" ? "calendar:open" :
            openTarget === "invite" || openTarget === "referral" ? "referral:open" :
            openTarget === "index" || openTarget === "vitana_index" ? "vitana:open-index" :
            null;
          if (overlayEvent) {
            window.dispatchEvent(new CustomEvent(overlayEvent));
            completeRecommendation(navigateResult.actionId).catch(() => {});
            return;
          }
        } catch {
          // target wasn't URL-parsable — fall through to normal navigate
        }
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
      const json = await completeRecommendation(actionId);
      if (json?.ok) {
        if (json.reward) toast.success(`+${json.reward} VTN earned!`);
        fetchRecommendations();
      } else {
        notifyError('toasts.common.couldNotCompleteTask');
      }
    } catch {
      notifyError('toasts.common.couldNotCompleteTask');
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
                    <>{t('screens.common.complete')}</>
                  )}
                </Button>
              )}
              {isCompleted && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
                  <Check className="w-3 h-3 mr-1" />
                  {t('screens.common.erledigt')}
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
          {action.contributionVector && (
            <PillarDeltaBadges
              vector={action.contributionVector}
              compact
              className="mt-2"
            />
          )}
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
            {t('screens.common.erledigt2')}
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
      <p className="text-sm text-muted-foreground">{t('screens.common.loadingRecommendations')}</p>
    </div>
  );

  // ── Error state ──
  const renderError = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <WifiOff className="w-10 h-10 text-destructive mb-4" />
      <p className="text-sm font-medium mb-1">{t('screens.common.couldNotLoadRecommendations')}</p>
      <p className="text-xs text-muted-foreground mb-4">{error}</p>
      <Button size="sm" variant="outline" onClick={() => fetchRecommendations()}>
        {t('screens.common.tryAgain')}
      </Button>
    </div>
  );

  // ── Empty state ──
  const renderEmpty = () => (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <PartyPopper className="w-10 h-10 text-primary mb-4" />
      <p className="text-sm font-medium mb-1">{t('screens.common.allCaughtUp')}</p>
      <p className="text-xs text-muted-foreground">{t('screens.common.noNewRecommendationsRightNowCheck')}</p>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderLoading();
    if (error) return renderError();
    if (allVisibleActions.length === 0) return renderEmpty();

    return (
      <>
        {showBanner && renderBanner()}

        {/* Index lift header strip — what the selection moves the Index by */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 px-3 py-2 mb-3 text-sm flex items-center justify-between">
          <span>
            {currentTotal !== null ? (
              <>{t('screens.common.now')} <strong>{currentTotal}</strong>
                {selectedLift > 0 ? (
                  <>{t('screens.common.value0AfterGoValue1', { value0: " ", value1: " " })}<strong className="text-green-600 font-semibold">
                      {currentTotal + selectedLift}
                    </strong>
                  </>
                ) : null}
              </>
            ) : (
              "Index loading…"
            )}
          </span>
          {selectedLift > 0 ? (
            <span className="text-xs text-green-600 font-semibold">+{selectedLift}</span>
          ) : (
            <span className="text-xs text-muted-foreground">{EMPTY_COPY.autopilotPopupZero}</span>
          )}
        </div>

        <ScrollArea className={cn(isMobile ? "flex-1" : "max-h-96")}>
          <div className="space-y-2">
            {groupedActions.map(([pillarKey, actions], groupIdx) => {
              const isUnassigned =
                (pillarKey as unknown as string) === "_unassigned";
              const pillar = isUnassigned ? null : (pillarKey as VitanaPillarKey);
              return (
                <div key={pillarKey as string}>
                  {showGroupHeaders && pillar && (
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-2 ${groupIdx === 0 ? "" : "mt-3"} text-pill-${pillar}-accent`}
                    >
                      <span aria-hidden="true">{PILLAR_EMOJI[pillar]}</span>
                      {PILLAR_LABEL[pillar]}
                    </div>
                  )}
                  {showGroupHeaders && isUnassigned && (
                    <div className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-2 mb-2 ${groupIdx === 0 ? "" : "mt-3"} text-muted-foreground`}>
                      <span aria-hidden="true">✨</span>{t('screens.common.other')}
                    </div>
                  )}
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <ActionItem key={action.id} action={action} />
                    ))}
                  </div>
                </div>
              );
            })}
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
                )}{t('screens.common.goLength', { length: selectedActions.length })}
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