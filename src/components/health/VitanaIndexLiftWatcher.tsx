import { useEffect, useRef } from "react";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import type { VitanaIndexPillars } from "@/hooks/useVitanaIndex";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";
import { celebrate } from "@/lib/celebrate";
import { getVitanaIndexTier } from "@/lib/vitanaIndex";

interface Snapshot {
  total: number;
  pillars: VitanaIndexPillars;
  tierLabel: string;
}

const PILLAR_KEYS: VitanaPillarKey[] = ["nutrition", "hydration", "exercise", "sleep", "mental"];
const PILLAR_THRESHOLDS = [50, 100, 150, 180];

function diffPillars(prev: VitanaIndexPillars, next: VitanaIndexPillars): ContributionVector {
  const vector: ContributionVector = {};
  for (const key of PILLAR_KEYS) {
    const delta = next[key] - prev[key];
    if (delta > 0) vector[key] = delta;
  }
  return vector;
}

function crossedPillarThresholds(
  prev: VitanaIndexPillars,
  next: VitanaIndexPillars,
): Array<{ pillar: VitanaPillarKey; threshold: number }> {
  const crossings: Array<{ pillar: VitanaPillarKey; threshold: number }> = [];
  for (const pillar of PILLAR_KEYS) {
    for (const threshold of PILLAR_THRESHOLDS) {
      if (prev[pillar] < threshold && next[pillar] >= threshold) {
        crossings.push({ pillar, threshold });
      }
    }
  }
  return crossings;
}

/**
 * Mounted once at the app root. Holds the previous Index snapshot in a ref
 * and routes positive deltas through `celebrate()`. Source-agnostic — catches
 * diary, autopilot, calendar, wearable ingestions because they all
 * invalidate the same React Query.
 *
 * Phase 2: also watches for tier-up crossings and per-pillar threshold
 * crossings (50/100/150/180), routed through the same celebrate() funnel so
 * dedupe and reduced-motion rules stay consistent.
 *
 * Bootstraps silently — opening the app must never fire a celebration just
 * because the first snapshot has arrived.
 */
export function VitanaIndexLiftWatcher() {
  const { index } = useVitanaIndexCache();
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!index) return;
    const next: Snapshot = {
      total: index.total,
      pillars: index.pillars,
      tierLabel: index.tier.label,
    };

    if (prevRef.current === null) {
      prevRef.current = next;
      return;
    }

    const prev = prevRef.current;
    const totalDelta = next.total - prev.total;
    const vector = diffPillars(prev.pillars, next.pillars);
    const anyPillarUp = Object.keys(vector).length > 0;

    // Update the snapshot eagerly so re-renders during the same tick don't
    // double-fire if the cache happens to settle in two steps.
    prevRef.current = next;

    if (totalDelta >= 1 || anyPillarUp) {
      celebrate({
        kind: "index-lift",
        vector,
        newTotal: next.total,
        magnitude: Math.max(totalDelta, 0),
      });
    }

    // Tier-up — fires the milestone modal and a tier-specific analytics event.
    if (next.tierLabel !== prev.tierLabel && next.total > prev.total) {
      const tier = getVitanaIndexTier(next.total);
      celebrate({
        kind: "tier-up",
        tierLabel: tier.label,
        tierThreshold: tier.min,
        newTotal: next.total,
        source: "watcher",
      });
    }

    // Pillar thresholds — quiet Sonner toasts, throttled per (pillar,
    // threshold) pair per 24h via the celebrate() day-key dedupe.
    for (const { pillar, threshold } of crossedPillarThresholds(prev.pillars, next.pillars)) {
      celebrate({
        kind: "pillar-threshold",
        pillar,
        thresholdValue: threshold,
        source: "watcher",
      });
    }
  }, [index]);

  return null;
}

export default VitanaIndexLiftWatcher;
