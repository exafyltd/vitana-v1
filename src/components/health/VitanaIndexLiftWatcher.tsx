import { useEffect, useRef } from "react";
import { useVitanaIndexCache } from "./VitanaIndexProvider";
import type { VitanaIndexPillars } from "@/hooks/useVitanaIndex";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";
import { celebrate } from "@/lib/celebrate";

interface Snapshot {
  total: number;
  pillars: VitanaIndexPillars;
}

const PILLAR_KEYS: VitanaPillarKey[] = ["nutrition", "hydration", "exercise", "sleep", "mental"];

function diffPillars(prev: VitanaIndexPillars, next: VitanaIndexPillars): ContributionVector {
  const vector: ContributionVector = {};
  for (const key of PILLAR_KEYS) {
    const delta = next[key] - prev[key];
    if (delta > 0) vector[key] = delta;
  }
  return vector;
}

/**
 * Mounted once at the app root. Holds the previous Index snapshot in a ref
 * and, whenever the cached total or any pillar increases, routes the delta
 * through `celebrate({ kind: 'index-lift', ... })`. Source-agnostic: catches
 * diary, autopilot, calendar and wearable ingestions because they all
 * invalidate the same React Query.
 *
 * Bootstraps silently — opening the app must never fire a celebration just
 * because the first snapshot has arrived.
 */
export function VitanaIndexLiftWatcher() {
  const { index } = useVitanaIndexCache();
  const prevRef = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!index) return;
    const next: Snapshot = { total: index.total, pillars: index.pillars };

    if (prevRef.current === null) {
      prevRef.current = next;
      return;
    }

    const prev = prevRef.current;
    const totalDelta = next.total - prev.total;
    const vector = diffPillars(prev.pillars, next.pillars);
    const anyPillarUp = Object.keys(vector).length > 0;

    prevRef.current = next;

    if (totalDelta < 1 && !anyPillarUp) return;

    celebrate({
      kind: "index-lift",
      vector,
      newTotal: next.total,
      magnitude: Math.max(totalDelta, 0),
    });
  }, [index]);

  return null;
}

export default VitanaIndexLiftWatcher;
