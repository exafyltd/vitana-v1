import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import { pillarKeys, pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import { LIFE_COMPASS_OPEN_EVENT } from "@/context/LifeCompassPopupContext";

export const VITANA_INDEX_OPEN_EVENT = "vitana:open-index";

const PILLAR_EMOJI: Record<VitanaPillarKey, string> = {
  nutrition: "🥗",
  hydration: "💧",
  exercise: "💪",
  sleep: "😴",
  mental: "🧠",
};

function pillarSevenDayDelta(
  history: Array<{ date: string; score: number }>,
): number | null {
  if (history.length < 2) return null;
  const first = history[0].score;
  const last = history[history.length - 1].score;
  return last - first;
}

/**
 * Single ambient orientation surface for the Vitana Index. Reachable via the
 * sidebar chip (desktop), the mobile chip, or any code dispatching
 * `vitana:open-index`. Mounted once at the app root — never navigates away;
 * always overlays whatever screen the user is on.
 *
 * Phase 1 ships the Today section only (live total + tier + balance factor +
 * 5-pillar pulses). The Next-few-days and 30-day horizon sections land in
 * Phase 2.
 */
export function VitanaIndexSheet() {
  const [open, setOpen] = useState(false);
  const { index, isLoading } = useVitanaIndexCache();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, handler);
    return () => window.removeEventListener(VITANA_INDEX_OPEN_EVENT, handler);
  }, []);

  const total = index?.total ?? null;
  const tierLabel = index?.tier?.label ?? null;
  const tierFraming = index?.tier?.framing ?? null;
  const balanceFactor = index?.balanceFactor ?? null;
  const pillars = index?.pillars ?? null;
  const sevenDayDelta = index?.history ? pillarSevenDayDelta(index.history) : null;

  const handleCompassClick = () => {
    window.dispatchEvent(new CustomEvent(LIFE_COMPASS_OPEN_EVENT));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Your Index</SheetTitle>
          {tierLabel && (
            <SheetDescription className="text-sm text-muted-foreground">
              {tierFraming ?? tierLabel}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <section aria-labelledby="vitana-index-today" className="space-y-4">
            <h3
              id="vitana-index-today"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Today
            </h3>

            <div className="flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400/30 to-blue-500/30 flex items-center justify-center shadow-lg"
                role="img"
                aria-label={
                  isLoading || total === null
                    ? "Loading Vitana Index"
                    : `Vitana Index ${total} of 999`
                }
              >
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">
                    {isLoading || total === null ? "…" : total}
                  </div>
                  <div className="text-xs text-muted-foreground">of 999</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {tierLabel && (
                <Badge variant="secondary" className="text-sm">
                  {tierLabel}
                </Badge>
              )}
              {sevenDayDelta !== null && sevenDayDelta !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {sevenDayDelta > 0 ? "+" : ""}
                  {sevenDayDelta} this week
                </Badge>
              )}
              {balanceFactor !== null && (
                <Badge variant="outline" className="text-xs">
                  Balance {Math.round(balanceFactor * 100)}%
                </Badge>
              )}
            </div>

            {pillars && (
              <div className="grid grid-cols-5 gap-1.5">
                {pillarKeys().map((key) => (
                  <div
                    key={key}
                    className={`bg-pill-${key}-tint text-pill-${key}-accent rounded-xl px-1 py-2 flex flex-col items-center gap-0.5`}
                    title={`${pillarLabel(key)}: ${pillars[key]}/200`}
                  >
                    <span className="text-base leading-none">{PILLAR_EMOJI[key]}</span>
                    <span className="text-xs font-semibold">{pillars[key]}</span>
                    <span className="text-[10px] opacity-70">/200</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          <button
            type="button"
            onClick={handleCompassClick}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-left"
          >
            Open your Life Compass →
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VitanaIndexSheet;
