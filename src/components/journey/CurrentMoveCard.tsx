import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, Zap, ChevronRight, Sparkles } from "lucide-react";
import type {
  FoundationStepStatus,
  JourneyFoundationSnapshot,
} from "@/hooks/useJourneyFoundation";

/**
 * VTID-03255 — "Jetzt wichtig": the one current move Vitana is guiding, plus a
 * compact hero strip (Tag X / Tage übrig / both north stars). One action only —
 * never a menu — so the screen mirrors exactly what Vitana drives by voice.
 */

function StatusPill({ status }: { status: FoundationStepStatus }) {
  const map: Record<FoundationStepStatus, { label: string; cls: string; icon: JSX.Element }> = {
    open: { label: "Offen", cls: "text-muted-foreground", icon: <Circle className="w-3.5 h-3.5" /> },
    not_found: { label: "Offen", cls: "text-muted-foreground", icon: <Circle className="w-3.5 h-3.5" /> },
    checking: { label: "Prüfe…", cls: "text-blue-600", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    done: { label: "Erledigt", cls: "text-green-600", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    active: { label: "Aktiv", cls: "text-purple-600", icon: <Zap className="w-3.5 h-3.5" /> },
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
            {gateOpen ? "Definiere dein Ziel" : `Tag ${snapshot.goal_day ?? 1}`}
            {!gateOpen && snapshot.days_left != null && (
              <span className="ml-1 text-purple-600">· {snapshot.days_left} Tage übrig</span>
            )}
          </div>
          {snapshot.graduated && (
            <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
              <Sparkles className="w-3.5 h-3.5" /> Fundament steht
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
                Jetzt wichtig
              </p>
              <StatusPill status={next.status} />
            </div>
            <p className="text-sm font-semibold text-foreground">{next.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{next.benefit}</p>
            {onStart && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 h-8 px-2 text-purple-700 hover:text-purple-800"
                onClick={() => onStart(next.key)}
              >
                Los geht's
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
