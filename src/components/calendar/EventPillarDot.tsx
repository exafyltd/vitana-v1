/**
 * Tiny colored dot on calendar event tiles indicating the Vitana Index pillar
 * the event advances. Part of Phase 6 of the Ultimate Goal hardening (see
 * docs/GOVERNANCE/ULTIMATE-GOAL.md in vitana-platform).
 *
 * Source of truth, in order:
 *   1. event.pillar (gateway migration 20260428000000 — explicit field)
 *   2. event.contribution_vector (legacy fallback — pick the pillar with
 *      the highest weight)
 *   3. nothing — render nothing
 *
 * Color palette mirrors the Vitana Index pillar tokens used elsewhere
 * (MissionAlignmentCard, Index Detail). Tailwind utilities keep the dot
 * inline and zero-config — no new design tokens added.
 */

import { t } from "@/lib/i18n-toast";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

type PillarKey = "nutrition" | "hydration" | "exercise" | "sleep" | "mental";

const PILLAR_ORDER: ReadonlyArray<PillarKey> = [
  "nutrition",
  "hydration",
  "exercise",
  "sleep",
  "mental",
];

const PILLAR_COLOR: Record<PillarKey, string> = {
  nutrition: "bg-lime-500",
  hydration: "bg-sky-400",
  exercise: "bg-orange-500",
  sleep: "bg-purple-500",
  mental: "bg-pink-500",
};

function resolvePrimaryPillar(event: CalendarEvent): PillarKey | null {
  if (event.pillar && PILLAR_ORDER.includes(event.pillar as PillarKey)) {
    return event.pillar as PillarKey;
  }
  const cv = event.contribution_vector;
  if (cv) {
    let best: { p: PillarKey; v: number } | null = null;
    for (const p of PILLAR_ORDER) {
      const raw = (cv as Partial<Record<PillarKey, number>>)[p];
      const v = typeof raw === "number" ? raw : 0;
      if (v > 0 && (!best || v > best.v)) best = { p, v };
    }
    return best?.p ?? null;
  }
  return null;
}

interface EventPillarDotProps {
  event: CalendarEvent;
}

export function EventPillarDot({ event }: EventPillarDotProps) {
  const pillar = resolvePrimaryPillar(event);
  if (!pillar) return null;
  return (
    <span
      className={`inline-block w-2 h-2 shrink-0 rounded-full ${PILLAR_COLOR[pillar]}`}
      role="img"
      aria-label={t(`screens.health.pillars.${pillar}`)}
      title={t(`screens.health.pillars.${pillar}`)}
    />
  );
}
