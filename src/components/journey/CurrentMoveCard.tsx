import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, Zap, ChevronRight, Sparkles } from "lucide-react";
import type {
  FoundationStepStatus,
  JourneyFoundationSnapshot,
} from "@/hooks/useJourneyFoundation";
import { t } from "@/lib/i18n-toast";

/**
 * VTID-03255 — "Jetzt wichtig": the one current move Vitana is guiding, plus a
 * compact hero strip (Tag X / Tage übrig / both north stars). One action only —
 * never a menu — so the screen mirrors exactly what Vitana drives by voice.
 *
 * The gateway ships step titles/benefits in English. Like FoundationPath, we
 * localize them here (keyed by step.key) so the German UI never shows the
 * gateway's English copy; an unknown key falls back to the gateway text.
 */
function localizedStep(
  catalog: "foundationStepLabels" | "foundationStepBenefits",
  key: string,
  fallback: string,
): string {
  const v = t(`screens.autopilotdashboard.${catalog}.${key}`);
  return v.includes(catalog) ? fallback : v;
}

function StatusPill({ status }: { status: FoundationStepStatus }) {
  const map: Record<FoundationStepStatus, { label: string; cls: string; icon: JSX.Element }> = {
    open: { label: t("screens.autopilotdashboard.statusOpen"), cls: "text-muted-foreground", icon: <Circle className="w-3.5 h-3.5" /> },
    not_found: { label: t("screens.autopilotdashboard.statusOpen"), cls: "text-muted-foreground", icon: <Circle className="w-3.5 h-3.5" /> },
    checking: { label: t("screens.autopilotdashboard.statusChecking"), cls: "text-blue-600", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    done: { label: t("screens.autopilotdashboard.statusDone"), cls: "text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    active: { label: t("screens.autopilotdashboard.statusActive"), cls: "text-purple-600", icon: <Zap className="w-3.5 h-3.5" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

export function CurrentMoveCard({
  snapshot,
  loading,
  onStart,
}: {
  snapshot: JourneyFoundationSnapshot | null;
  loading: boolean;
  onStart?: (stepKey: string) => void;
}) {
  if (loading && !snapshot) {
    return (
      <Card className="border-purple-100">
        <CardContent className="p-4">
          <div className="h-4 w-24 bg-purple-100 rounded animate-pulse mb-2" />
          <div className="h-5 w-2/3 bg-purple-50 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }
  if (!snapshot) return null;

  const next = snapshot.current_next_step;
  const gateOpen = !snapshot.journey_started;

  return (
    <Card className="border-purple-100 bg-white/80">
      <CardContent className="p-4 space-y-3">
        {/* Hero strip — where you are + both north stars */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {gateOpen
              ? t("screens.autopilotdashboard.defineYourGoal")
              : t("screens.autopilotdashboard.dayN", { day: snapshot.goal_day ?? 1 })}
            {!gateOpen && snapshot.days_left != null && (
              <span className="ml-1 text-purple-600">
                · {t("screens.autopilotdashboard.daysLeftN", { days: snapshot.days_left })}
              </span>
            )}
          </div>
          {snapshot.graduated && (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <Sparkles className="w-3.5 h-3.5" /> {t("screens.autopilotdashboard.foundationReady")}
            </span>
          )}
        </div>

        {(snapshot.north_stars.health || snapshot.north_stars.economy) && (
          <div className="flex flex-wrap gap-1.5">
            {snapshot.north_stars.health && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                🌿 {snapshot.north_stars.health}
              </span>
            )}
            {snapshot.north_stars.economy && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                💠 {snapshot.north_stars.economy}
              </span>
            )}
          </div>
        )}

        {/* The one next move */}
        {next && (
          <div className="rounded-xl border border-purple-100 p-3 bg-purple-50/40">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-wide text-purple-700 font-semibold">
                {t("screens.autopilotdashboard.nowImportant")}
              </p>
              <StatusPill status={next.status} />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {localizedStep("foundationStepLabels", next.key, next.title)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {localizedStep("foundationStepBenefits", next.key, next.benefit)}
            </p>
            {onStart && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-8 px-2 text-purple-700 hover:text-purple-800"
                onClick={() => onStart(next.key)}
              >
                {t("screens.autopilotdashboard.letsGo")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
