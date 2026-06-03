import { t } from "@/lib/i18n-toast";
import type { LucideIcon } from "lucide-react";
import { Flame, Moon, Zap, Sparkles } from "lucide-react";
import type { MyJourneyGoal } from "@/hooks/useMyJourney";

const SERIF: React.CSSProperties = { fontFamily: "Cormorant, Georgia, serif" };

// Why this section looks the way it does (grounded in motivation research):
//   • Future self-continuity (Hershfield): the more vividly and warmly people
//     picture their future self, the more they act for it today → a concrete,
//     present-tense "imagine waking up…" visioning line, not abstract stats.
//   • Identity-based change (Clear / self-perception): tiles are framed as the
//     person you're *becoming* ("Stärker", "Ruhiger", "Mehr Energie"), not tasks.
//   • Positive affect / best-possible-self (King): warm, hopeful, sensory copy
//     and bright sunrise gradients (the old tiles fell back to a flat grey when
//     the .webp art was missing — so we paint them in pure CSS instead).
//   • Self-efficacy: a time anchor ("in ~6 Monaten", from the real goal
//     deadline) makes the future feel near and reachable.
interface Tile {
  id: string;
  /** warm, alive gradient — never depends on a shipped image asset */
  gradient: string;
  titleKey: string;
  subKey: string;
  icon: LucideIcon;
}

const TILES: Tile[] = [
  {
    id: "stronger",
    gradient: "linear-gradient(155deg, #fb923c 0%, #f472b6 55%, #a78bfa 100%)",
    titleKey: "screens.autopilotdashboard.futureSelfStrongerTitle",
    subKey: "screens.autopilotdashboard.futureSelfStrongerSub",
    icon: Flame,
  },
  {
    id: "calmer",
    gradient: "linear-gradient(155deg, #818cf8 0%, #60a5fa 55%, #22d3ee 100%)",
    titleKey: "screens.autopilotdashboard.futureSelfCalmerTitle",
    subKey: "screens.autopilotdashboard.futureSelfCalmerSub",
    icon: Moon,
  },
  {
    id: "energy",
    gradient: "linear-gradient(155deg, #f472b6 0%, #fb7185 50%, #fcd34d 100%)",
    titleKey: "screens.autopilotdashboard.futureSelfEnergyTitle",
    subKey: "screens.autopilotdashboard.futureSelfEnergySub",
    icon: Zap,
  },
];

/**
 * "Dein zukünftiges Ich" — the aspirational beat under the dream-board hero.
 * A vivid visioning line + three identity tiles (who you're becoming) + a
 * closing affirmation, anchored to the user's real goal horizon.
 */
export function FutureSelfTiles({ goal }: { goal?: MyJourneyGoal | null }) {
  const months =
    goal?.has_deadline && goal.days_to_deadline && goal.days_to_deadline > 20
      ? Math.max(1, Math.round(goal.days_to_deadline / 30))
      : null;
  const anchor = months
    ? t("screens.autopilotdashboard.futureSelfInMonths", { months })
    : t("screens.autopilotdashboard.futureSelfHint");

  return (
    <div>
      {/* Section header + time anchor */}
      <div className="flex items-baseline justify-between mx-4 mb-2 mt-5">
        <h2 className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground">
          {t("screens.autopilotdashboard.futureSelfTitle")}
        </h2>
        <span className="text-xs text-violet-500 font-semibold inline-flex items-center gap-0.5">
          <Sparkles className="w-3 h-3" />
          {anchor}
        </span>
      </div>

      {/* Vivid visioning line — the emotional hook (future self-continuity) */}
      <div
        className="mx-4 mb-3 rounded-[20px] px-4 py-3.5 relative overflow-hidden border border-white/60"
        style={{
          background:
            "linear-gradient(120deg, #fde2ec 0%, #ede9fe 50%, #dbeafe 100%)",
          boxShadow: "0 6px 18px rgba(196,181,253,0.25)",
        }}
      >
        <div
          className="absolute -top-6 -right-4 w-24 h-24 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(252,211,77,0.45), transparent)" }}
          aria-hidden
        />
        <p
          className="relative italic font-semibold leading-snug"
          style={{ ...SERIF, color: "#6d28d9", fontSize: 16.5 }}
        >
          {t("screens.autopilotdashboard.futureSelfVision")}
        </p>
      </div>

      {/* Identity tiles — who you're becoming */}
      <div className="grid grid-cols-3 gap-2.5 mx-4">
        {TILES.map((tile) => (
          <div
            key={tile.id}
            className="relative aspect-[3/4] rounded-[18px] overflow-hidden shadow-md"
            style={{ background: tile.gradient }}
          >
            {/* top sheen + bottom legibility scrim */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.4), transparent 55%), linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.45) 100%)",
              }}
              aria-hidden
            />
            <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-violet-700 backdrop-blur-sm shadow-sm">
              <tile.icon className="w-3.5 h-3.5" />
            </div>
            <div className="absolute left-2.5 right-2 bottom-2.5 text-white">
              <div
                className="font-bold leading-tight"
                style={{ ...SERIF, fontSize: 16, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
              >
                {t(tile.titleKey)}
              </div>
              <div className="text-[10px] font-medium text-white/90 leading-tight mt-0.5">
                {t(tile.subKey)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Closing affirmation — identity reinforcement */}
      <p
        className="text-center mx-4 mt-3.5 italic font-semibold"
        style={{ ...SERIF, color: "#6d28d9", fontSize: 15.5 }}
      >
        {t("screens.autopilotdashboard.futureSelfBecoming")}
        <span className="not-italic text-amber-400 ml-1">✨</span>
      </p>
    </div>
  );
}

export default FutureSelfTiles;
