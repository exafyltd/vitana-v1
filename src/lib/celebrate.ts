/**
 * Source-agnostic celebration wrapper for Vitana Index growth.
 *
 * The reward currency is the Index value itself. When any ingestion path
 * (diary, autopilot, calendar, wearable) lifts the user's Index, the
 * VitanaIndexLiftWatcher diffs the cache and routes the delta through this
 * module. Phase 1 ships the `index-lift` kind only; tier-up / streak /
 * pillar-threshold celebrations are added in Phase 2 against the same shape.
 */

import { toast } from "sonner";
import { celebrateSuccess } from "./confetti";
import { playSound } from "./playSound";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";

export type CelebrateKind =
  | "index-lift"
  | "tier-up"
  | "pillar-threshold"
  | "streak"
  | "at-risk";

export interface CelebrateInput {
  kind: CelebrateKind;
  vector?: ContributionVector | null;
  newTotal?: number;
  magnitude?: number;
  vtnReward?: number;
  source?: string;
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

const BIG_LIFT_THRESHOLD = 10;
const LIFT_DEDUPE_WINDOW_MS = 30_000;
const CONFETTI_THROTTLE_MS = 5 * 60_000;
const SOUND_PREF_KEY = "vitana:sound:enabled";

let lastLiftSignature: { signature: string; firedAt: number } | null = null;
let lastConfettiAt = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function soundEnabled(): boolean {
  try {
    const v = localStorage.getItem(SOUND_PREF_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

function isLiftSuppressed(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __vitanaSuppressLiftUntil?: number };
  const until = w.__vitanaSuppressLiftUntil;
  if (typeof until === "number" && Date.now() < until) {
    w.__vitanaSuppressLiftUntil = 0;
    return true;
  }
  return false;
}

function emitAnalytics(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("celebrate.fired", { detail: payload }));
}

function pickDominantPillar(
  vector: ContributionVector | null | undefined,
): VitanaPillarKey | null {
  if (!vector) return null;
  let bestKey: VitanaPillarKey | null = null;
  let bestVal = 0;
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === "number" && v > bestVal && k in PILLAR_LABEL) {
      bestKey = k;
      bestVal = v;
    }
  }
  return bestKey;
}

function movedPillars(
  vector: ContributionVector | null | undefined,
): Array<[VitanaPillarKey, number]> {
  if (!vector) return [];
  const out: Array<[VitanaPillarKey, number]> = [];
  for (const [k, v] of Object.entries(vector) as Array<[VitanaPillarKey, number | undefined]>) {
    if (typeof v === "number" && v > 0 && k in PILLAR_LABEL) {
      out.push([k, v]);
    }
  }
  out.sort((a, b) => b[1] - a[1]);
  return out;
}

function formatLiftTitle(
  vector: ContributionVector | null | undefined,
  newTotal: number | undefined,
  vtnReward: number | undefined,
): string {
  const moved = movedPillars(vector);
  let leading: string;
  if (moved.length === 0) {
    leading = `Index +${newTotal ?? 0}`;
  } else if (moved.length === 1) {
    const [key, value] = moved[0];
    leading = `${PILLAR_EMOJI[key]} ${PILLAR_LABEL[key]} +${value}`;
  } else {
    const top = moved.slice(0, 2);
    leading = top.map(([k, v]) => `${PILLAR_LABEL[k]} +${v}`).join(", ");
  }
  const vtn = vtnReward && vtnReward > 0 ? ` · +${vtnReward} VTN` : "";
  const total = typeof newTotal === "number" ? `. Index now ${newTotal}` : "";
  return `${leading}${vtn}${total} ✨`;
}

function formatLiftDescription(vector: ContributionVector | null | undefined): string | undefined {
  const moved = movedPillars(vector);
  if (moved.length <= 1) return undefined;
  return moved.map(([k, v]) => `${PILLAR_LABEL[k]} +${v}`).join(" · ");
}

function fireIndexLift(input: CelebrateInput): { throttled: boolean } {
  const { vector, newTotal, magnitude = 0, vtnReward, source } = input;

  const signature = JSON.stringify({ vector: vector ?? null, newTotal: newTotal ?? null });
  const now = Date.now();
  if (
    lastLiftSignature &&
    lastLiftSignature.signature === signature &&
    now - lastLiftSignature.firedAt < LIFT_DEDUPE_WINDOW_MS
  ) {
    emitAnalytics({ kind: "index-lift", magnitude, source, throttled: true });
    return { throttled: true };
  }
  lastLiftSignature = { signature, firedAt: now };

  toast.success(formatLiftTitle(vector, newTotal, vtnReward), {
    description: formatLiftDescription(vector),
  });

  const reduced = prefersReducedMotion();
  const canConfetti = magnitude >= BIG_LIFT_THRESHOLD && !reduced && now - lastConfettiAt > CONFETTI_THROTTLE_MS;
  if (canConfetti) {
    lastConfettiAt = now;
    celebrateSuccess({
      type: "reward_earned",
      message: typeof newTotal === "number" ? `Index now ${newTotal}` : undefined,
    });
    if (soundEnabled()) {
      playSound("/audio/lift.mp3", 0.08);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("vitana:index-lifted", {
        detail: { vector, newTotal, magnitude, source: source ?? "unknown" },
      }),
    );
  }

  emitAnalytics({ kind: "index-lift", magnitude, source: source ?? "unknown", throttled: false });
  return { throttled: false };
}

/**
 * Fire a celebration. Phase 1 only handles `kind: "index-lift"`. Other kinds
 * are accepted but no-op so callers wired in Phase 2 can compile against the
 * stable shape.
 */
export function celebrate(input: CelebrateInput): { fired: boolean; throttled: boolean } {
  if (input.kind !== "index-lift") {
    return { fired: false, throttled: false };
  }
  if (isLiftSuppressed()) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("vitana:index-lifted", {
          detail: {
            vector: input.vector,
            newTotal: input.newTotal,
            magnitude: input.magnitude,
            source: input.source ?? "unknown",
          },
        }),
      );
    }
    emitAnalytics({
      kind: "index-lift",
      magnitude: input.magnitude ?? 0,
      source: input.source ?? "unknown",
      throttled: true,
    });
    return { fired: false, throttled: true };
  }
  const { throttled } = fireIndexLift(input);
  return { fired: !throttled, throttled };
}

/**
 * Encouraging copy for empty states across surfaces (Health, My Journey,
 * Autopilot popup, Index Sheet). Single source of truth so voice stays
 * consistent.
 */
export const EMPTY_COPY = {
  indexSheetNextDays:
    "No active Autopilot suggestions. When something lands here, completing it will move your Index.",
  indexSheetHorizon: "Need a few more days of data to project your 30-day arc.",
  myJourneyPath:
    "Your path is just beginning. When Autopilot has suggestions, they'll appear here as a path you can walk.",
  myJourneyOnePillar: "Pick one small thing — watch your Index move.",
  autopilotPopupZero: "Select actions to see Index lift.",
  healthEmpty: "Log your first entry to start your Index.",
} as const;
