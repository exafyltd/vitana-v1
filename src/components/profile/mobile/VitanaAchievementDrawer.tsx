/**
 * VTID-04470 — "About your VITANA INDEX": the light, praise-first drawer the
 * profile's (i) icon opens. It is NOT the detailed Index drawer
 * (VitanaIndexSheet) — "See full breakdown" hands off to that one.
 *
 * Every line is conditional on real data from deriveIndexHighlights(): no
 * percentile/rank (none exists for the Index), no pillar named unless its
 * score measurably rose, and in `public` mode nothing about the member's
 * pillars at all — the public RPC only exposes the total.
 */
import {
  Activity,
  Brain,
  ChevronRight,
  Droplet,
  Flame,
  Moon,
  Share2,
  Sparkles,
  TrendingUp,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { pillarLabel, type VitanaPillarKey } from "@/hooks/useVitanaIndex";
import type { IndexHighlights } from "@/lib/vitana-index-highlights";
import { t } from "@/lib/i18n-toast";
import { cn } from "@/lib/utils";

export const PILLAR_ICONS: Record<VitanaPillarKey, LucideIcon> = {
  nutrition: Utensils,
  hydration: Droplet,
  exercise: Activity,
  sleep: Moon,
  mental: Brain,
};

const PILLAR_TINT: Record<VitanaPillarKey, string> = {
  nutrition: "bg-emerald-100 text-emerald-700",
  hydration: "bg-sky-100 text-sky-700",
  exercise: "bg-cyan-100 text-cyan-700",
  sleep: "bg-indigo-100 text-indigo-700",
  mental: "bg-violet-100 text-violet-700",
};

/** Shortest streak worth celebrating — matches the sheet's "3 days in a row". */
const MIN_STREAK = 3;

interface VitanaAchievementDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** owner = the member's own data; public = another member's profile. */
  mode: "owner" | "public";
  highlights: IndexHighlights;
  streakDays?: number;
  onSeeFullBreakdown?: () => void;
  onShareProgress?: () => void;
}

export function VitanaAchievementDrawer({
  open,
  onOpenChange,
  mode,
  highlights,
  streakDays = 0,
  onSeeFullBreakdown,
  onShareProgress,
}: VitanaAchievementDrawerProps) {
  const isOwner = mode === "owner";
  const { kind, lifts, strongest, weekDelta, momentum } = highlights;
  const showStreak = isOwner && streakDays >= MIN_STREAK;
  const standingOut = isOwner && (kind === "boost" || momentum !== null);
  const topLift = lifts[0]?.pillar ?? null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        data-testid="vitana-achievement-drawer"
        className="max-h-[88dvh] rounded-t-[28px] border-white/70 bg-gradient-to-b from-white via-white to-sky-50/60"
      >
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-7 w-7 shrink-0 text-sky-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-start text-xl font-bold leading-tight text-slate-900">
                {isOwner ? t("profile.indexHero.aboutTitle") : t("profile.indexHero.aboutIndexAria")}
              </DrawerTitle>
              {isOwner && (
                <DrawerDescription className="mt-0.5 text-start text-sm text-slate-500">
                  {standingOut
                    ? t("profile.indexHero.subtitleStandingOut")
                    : t("profile.indexHero.subtitleNeutral")}
                </DrawerDescription>
              )}
            </div>
            <DrawerClose
              aria-label={t("profile.indexHero.close")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <X className="h-4 w-4" />
            </DrawerClose>
          </div>

          {/* Achievement pills — only what the data supports */}
          {isOwner && (momentum || showStreak) && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {momentum && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3.5 py-1.5 text-sm font-semibold text-sky-700">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  {momentum === "rising_fast"
                    ? t("profile.indexHero.risingFast")
                    : t("profile.indexHero.improving")}
                </span>
              )}
              {showStreak && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1.5 text-sm font-semibold text-emerald-700">
                  <Flame className="h-4 w-4" aria-hidden />
                  {t("profile.indexHero.streak", { count: streakDays })}
                </span>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-sm leading-relaxed text-slate-600">
            {isOwner ? t("profile.indexHero.aboutBody") : t("profile.indexHero.aboutBodyPublic")}
          </p>

          {/* Biggest boost / strongest area / fallback */}
          {isOwner && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-orange-500">
                <Flame className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                {kind !== "none" && (
                  <p className="text-sm font-semibold text-teal-800">
                    {kind === "boost"
                      ? t("profile.indexHero.boostHeading")
                      : t("profile.indexHero.strongestHeading")}
                  </p>
                )}
                <p className="text-sm leading-snug text-slate-700">
                  {kind === "boost" && topLift
                    ? t("profile.indexHero.boostLine", { pillar: pillarLabel(topLift) })
                    : kind === "strongest" && strongest
                      ? t("profile.indexHero.strongestLine", { pillar: pillarLabel(strongest) })
                      : t("profile.indexHero.fallback")}
                </p>
              </div>
            </div>
          )}

          {/* What helped most — pillars that actually rose */}
          {isOwner && kind === "boost" && lifts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-start text-sm font-semibold text-slate-900">
                {t("profile.indexHero.whatHelpedMost")}
              </h3>
              <ul className="mt-2 grid grid-cols-3 gap-2">
                {lifts.map(({ pillar }) => {
                  const Icon = PILLAR_ICONS[pillar];
                  return (
                    <li
                      key={pillar}
                      className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-slate-100 bg-white px-2 py-2.5 text-center shadow-sm"
                    >
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", PILLAR_TINT[pillar])}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="w-full break-words text-xs font-medium leading-tight text-slate-700">
                        {pillarLabel(pillar)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Momentum statement */}
          {isOwner && weekDelta !== null && weekDelta > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <TrendingUp className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm leading-snug text-slate-700">
                {t("profile.indexHero.momentumRisingFast", { delta: weekDelta })}
              </p>
            </div>
          )}

          {isOwner && onShareProgress && (
            <button
              type="button"
              onClick={onShareProgress}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-teal-300 text-base font-semibold text-white shadow-[0_6px_18px_rgba(14,165,233,0.3)] active:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            >
              <Share2 className="h-5 w-5" aria-hidden />
              {t("profile.indexHero.shareProgress")}
            </button>
          )}

          {isOwner && onSeeFullBreakdown && (
            <button
              type="button"
              onClick={onSeeFullBreakdown}
              className="mx-auto mt-3 flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-sky-600 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {t("profile.indexHero.seeFullBreakdown")}
              <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
            </button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
