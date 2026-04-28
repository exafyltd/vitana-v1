/**
 * Source-agnostic celebration wrapper for Vitana Index growth.
 *
 * The reward currency is the Index value itself. When any ingestion path
 * (diary, autopilot, calendar, wearable) lifts the user's Index, the
 * VitanaIndexLiftWatcher diffs the cache and routes the delta through this
 * module. Tier-up / streak / pillar-threshold celebrations land here too —
 * one funnel so throttle and reduced-motion rules stay consistent.
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

export type StreakLevel = 3 | 7 | 14 | 30;

export interface CelebrateInput {
  kind: CelebrateKind;
  vector?: ContributionVector | null;
  newTotal?: number;
  magnitude?: number;
  vtnReward?: number;
  source?: string;

  // Tier-up
  tierLabel?: string;
  tierThreshold?: number;

  // Pillar-threshold
  pillar?: VitanaPillarKey;
  thresholdValue?: number;

  // Streak
  streakDays?: number;
  streakMilestone?: StreakLevel;
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

const PILLAR_THRESHOLD_COPY: Record<VitanaPillarKey, Record<number, string>> = {
  nutrition: {
    50: "Nutrition just hit 50. Foundations forming 🥗",
    100: "Nutrition just hit 100. You're rebuilding 🥗",
    150: "Nutrition just hit 150. Strong fuel 🥗",
    180: "Nutrition just hit 180. Elite range 🥗",
  },
  hydration: {
    50: "Hydration just hit 50. Cells thank you 💧",
    100: "Hydration just hit 100. Steady stream 💧",
    150: "Hydration just hit 150. Crisp baseline 💧",
    180: "Hydration just hit 180. Rare territory 💧",
  },
  exercise: {
    50: "Exercise just hit 50. Body waking up 💪",
    100: "Exercise just hit 100. Real movement 💪",
    150: "Exercise just hit 150. Athlete mode 💪",
    180: "Exercise just hit 180. Top tier 💪",
  },
  sleep: {
    50: "Sleep just hit 50. Recovery starting 😴",
    100: "Sleep just hit 100. You're rebuilding 💤",
    150: "Sleep just hit 150. Deep, consistent rest 💤",
    180: "Sleep just hit 180. Rare for any age 💤",
  },
  mental: {
    50: "Mental just hit 50. Mind catching up 🧠",
    100: "Mental just hit 100. Steadier ground 🧠",
    150: "Mental just hit 150. Clear-headed 🧠",
    180: "Mental just hit 180. Calm power 🧠",
  },
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
  // Best-effort backend ingestion. We only post the small analytics shape
  // the gateway expects; never block the celebrate() funnel on the network
  // call (`.catch()` swallows). Anonymous sessions still get aggregated —
  // the gateway accepts unauthenticated POSTs.
  try {
    const body = JSON.stringify({
      kind: payload.kind,
      magnitude: typeof payload.magnitude === "number" ? payload.magnitude : undefined,
      source: typeof payload.source === "string" ? payload.source : undefined,
      throttled: payload.throttled === true,
      meta: extractMeta(payload),
    });
    void postCelebrateAnalytics(body);
  } catch {
    /* never let analytics break the celebration */
  }
}

function extractMeta(payload: Record<string, unknown>): Record<string, unknown> | undefined {
  const meta: Record<string, unknown> = {};
  for (const k of ["pillar", "thresholdValue", "tierLabel", "streakDays", "streakMilestone"]) {
    if (payload[k] !== undefined) meta[k] = payload[k];
  }
  return Object.keys(meta).length > 0 ? meta : undefined;
}

async function postCelebrateAnalytics(body: string): Promise<void> {
  const url = (import.meta.env?.VITE_GATEWAY_URL as string | undefined) ?? null;
  if (!url) return;
  let token: string | undefined;
  try {
    // Lazy import to keep this module tree-shakeable in non-React surfaces.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? undefined;
  } catch {
    /* anonymous post is fine */
  }
  await fetch(`${url.replace(/\/+$/, "")}/api/v1/analytics/celebrate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Vitana-Active-Role": "community",
    },
    body,
    keepalive: true,
  }).catch(() => {});
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayKeyFired(scope: string): boolean {
  try {
    const stored = localStorage.getItem(`vitana:celebrate:${scope}:day`);
    return stored === todayKey();
  } catch {
    return false;
  }
}

function markDayKeyFired(scope: string) {
  try {
    localStorage.setItem(`vitana:celebrate:${scope}:day`, todayKey());
  } catch {
    /* localStorage unavailable — accept duplicate fires */
  }
}

function dispatchMilestone(detail: {
  milestone: string;
  title: string;
  body: string;
  url?: string;
  rewardValue?: string;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("vitana-milestone", {
      detail: { url: "", ...detail },
    }),
  );
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

function fireTierUp(input: CelebrateInput): { throttled: boolean } {
  const { tierLabel, tierThreshold, newTotal, source } = input;
  if (!tierLabel) return { throttled: true };

  const scope = `tier_up:${tierLabel.toLowerCase().replace(/\s+/g, "_")}`;
  if (dayKeyFired(scope)) {
    emitAnalytics({ kind: "tier-up", source, throttled: true, tierLabel });
    return { throttled: true };
  }
  markDayKeyFired(scope);

  dispatchMilestone({
    milestone: `index_tier_up_${tierLabel.toLowerCase().replace(/\s+/g, "_")}`,
    title: `Welcome to ${tierLabel}`,
    body:
      typeof tierThreshold === "number"
        ? `Your Index just crossed ${tierThreshold}.`
        : "Your Index just stepped up a tier.",
    rewardValue:
      typeof newTotal === "number" ? `Index ${newTotal}` : undefined,
  });

  const now = Date.now();
  if (!prefersReducedMotion() && now - lastConfettiAt > CONFETTI_THROTTLE_MS) {
    lastConfettiAt = now;
    celebrateSuccess({ type: "reward_earned", message: `Welcome to ${tierLabel}` });
    if (soundEnabled()) playSound("/audio/lift.mp3", 0.08);
  }

  emitAnalytics({ kind: "tier-up", source: source ?? "watcher", throttled: false, tierLabel });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("celebrate.tier", { detail: { tierLabel, newTotal } }),
    );
  }
  return { throttled: false };
}

function firePillarThreshold(input: CelebrateInput): { throttled: boolean } {
  const { pillar, thresholdValue, source } = input;
  if (!pillar || typeof thresholdValue !== "number") return { throttled: true };

  const scope = `pillar:${pillar}:${thresholdValue}`;
  if (dayKeyFired(scope)) {
    emitAnalytics({ kind: "pillar-threshold", pillar, thresholdValue, source, throttled: true });
    return { throttled: true };
  }
  markDayKeyFired(scope);

  const copy =
    PILLAR_THRESHOLD_COPY[pillar]?.[thresholdValue] ??
    `${PILLAR_LABEL[pillar]} just hit ${thresholdValue} ${PILLAR_EMOJI[pillar]}`;

  toast.success(copy);
  emitAnalytics({ kind: "pillar-threshold", pillar, thresholdValue, source: source ?? "watcher", throttled: false });
  return { throttled: false };
}

function fireStreak(input: CelebrateInput): { throttled: boolean } {
  const { streakDays, streakMilestone, source } = input;
  if (typeof streakDays !== "number" || streakDays < 1) return { throttled: true };

  if (typeof streakMilestone === "number") {
    const scope = `streak:${streakMilestone}`;
    if (dayKeyFired(scope)) {
      emitAnalytics({ kind: "streak", streakDays, streakMilestone, source, throttled: true });
      return { throttled: true };
    }
    markDayKeyFired(scope);

    dispatchMilestone({
      milestone: `streak_${streakMilestone}`,
      title: `🔥 ${streakMilestone}-day streak`,
      body:
        streakMilestone >= 30
          ? "A whole month. This is becoming who you are."
          : streakMilestone >= 14
          ? "Two weeks. Autopilot is loving this."
          : streakMilestone >= 7
          ? "A full week. Habits are forming."
          : "Three days. The streak is real.",
    });
    emitAnalytics({ kind: "streak", streakDays, streakMilestone, source: source ?? "streak-hook", throttled: false });
    return { throttled: false };
  }

  toast.success(`🔥 ${streakDays}-day streak — Autopilot is loving this`);
  emitAnalytics({ kind: "streak", streakDays, source: source ?? "streak-hook", throttled: false });
  return { throttled: false };
}

function fireAtRisk(input: CelebrateInput): { throttled: boolean } {
  const { source } = input;
  const scope = "at_risk";
  if (dayKeyFired(scope)) {
    emitAnalytics({ kind: "at-risk", source, throttled: true });
    return { throttled: true };
  }
  markDayKeyFired(scope);
  toast.message("🔥 Don't break the streak — one small action today");
  emitAnalytics({ kind: "at-risk", source: source ?? "streak-hook", throttled: false });
  return { throttled: false };
}

/**
 * Fire a celebration. Routes by `kind` to the matching surface (Sonner toast,
 * milestone modal event, etc.) with shared throttle / dedupe / reduced-motion
 * rules so the user never gets a barrage.
 */
export function celebrate(input: CelebrateInput): { fired: boolean; throttled: boolean } {
  if (input.kind === "index-lift") {
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

  let result: { throttled: boolean };
  switch (input.kind) {
    case "tier-up":
      result = fireTierUp(input);
      break;
    case "pillar-threshold":
      result = firePillarThreshold(input);
      break;
    case "streak":
      result = fireStreak(input);
      break;
    case "at-risk":
      result = fireAtRisk(input);
      break;
    default:
      result = { throttled: true };
  }
  return { fired: !result.throttled, throttled: result.throttled };
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
