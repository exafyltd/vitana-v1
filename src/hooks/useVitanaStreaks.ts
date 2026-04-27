import { useCallback, useEffect, useMemo, useState } from "react";
import { celebrate, type StreakLevel } from "@/lib/celebrate";

const STORE_KEY = "vitana:streak:active-days";
const FIRED_PREFIX = "vitana:streak:fired:";
const STREAK_MILESTONES: StreakLevel[] = [3, 7, 14, 30];

interface StreakStore {
  /** Set of YYYY-MM-DD day-keys (user-local) that had ≥1 Index-lifting activity. */
  days: string[];
  /** Longest streak ever observed for analytics / display. */
  longest: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readStore(): StreakStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { days: [], longest: 0 };
    const parsed = JSON.parse(raw) as StreakStore;
    return {
      days: Array.isArray(parsed.days) ? parsed.days : [],
      longest: typeof parsed.longest === "number" ? parsed.longest : 0,
    };
  } catch {
    return { days: [], longest: 0 };
  }
}

function writeStore(store: StreakStore) {
  try {
    // Trim to last 60 days so the entry never bloats indefinitely.
    const sorted = [...new Set(store.days)].sort();
    const trimmed = sorted.slice(-60);
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ days: trimmed, longest: store.longest }),
    );
  } catch {
    /* localStorage unavailable — accept loss */
  }
}

function consecutiveStreak(days: Set<string>, today: Date): number {
  let count = 0;
  const cursor = new Date(today);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function isAtRisk(days: Set<string>, today: Date): boolean {
  if (days.has(todayKey())) return false;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return days.has(yesterday.toISOString().slice(0, 10));
}

function pickCrossedMilestone(
  prev: number,
  next: number,
): StreakLevel | null {
  for (const m of STREAK_MILESTONES) {
    if (prev < m && next >= m) return m;
  }
  return null;
}

export interface VitanaStreakState {
  current: number;
  longest: number;
  atRisk: boolean;
}

/**
 * Tracks consecutive days with ≥1 Index-lifting activity (any source — diary,
 * autopilot, calendar, wearable). Backed by `localStorage`; populated from
 * `vitana:index-lifted` events the lift watcher already dispatches. Fires
 * streak milestone celebrations (3 / 7 / 14 / 30) at most once per crossing,
 * and an at-risk nudge after 18:00 local on days where yesterday counted but
 * today hasn't yet.
 */
export function useVitanaStreaks(): VitanaStreakState {
  const [tick, setTick] = useState(0);

  const { current, longest, atRisk } = useMemo<VitanaStreakState>(() => {
    const store = readStore();
    const set = new Set(store.days);
    const today = new Date();
    const cur = consecutiveStreak(set, today);
    return {
      current: cur,
      longest: Math.max(store.longest, cur),
      atRisk: isAtRisk(set, today),
    };
  }, [tick]);

  const recordToday = useCallback(() => {
    const store = readStore();
    const today = todayKey();
    if (store.days.includes(today)) return;

    const set = new Set([...store.days, today]);
    const newCurrent = consecutiveStreak(set, new Date());
    const prevCurrent = consecutiveStreak(new Set(store.days), new Date());

    writeStore({
      days: Array.from(set),
      longest: Math.max(store.longest, newCurrent),
    });
    setTick((n) => n + 1);

    const crossed = pickCrossedMilestone(prevCurrent, newCurrent);
    if (crossed) {
      const firedKey = `${FIRED_PREFIX}${crossed}`;
      try {
        if (!localStorage.getItem(firedKey)) {
          localStorage.setItem(firedKey, todayKey());
          celebrate({
            kind: "streak",
            streakDays: newCurrent,
            streakMilestone: crossed,
            source: "streak-hook",
          });
        }
      } catch {
        /* localStorage unavailable — skip milestone celebration this session */
      }
    }
  }, []);

  // Listen for any Index lift and credit today.
  useEffect(() => {
    const handler = () => recordToday();
    window.addEventListener("vitana:index-lifted", handler);
    return () => window.removeEventListener("vitana:index-lifted", handler);
  }, [recordToday]);

  // At-risk nudge after 18:00 local.
  useEffect(() => {
    if (!atRisk) return;
    const now = new Date();
    if (now.getHours() < 18) return;
    celebrate({ kind: "at-risk", source: "streak-hook" });
  }, [atRisk]);

  // Re-evaluate at midnight so a streak doesn't appear stale until the next render.
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 5, 0);
    const id = window.setTimeout(() => setTick((n) => n + 1), midnight.getTime() - now.getTime());
    return () => window.clearTimeout(id);
  }, [tick]);

  return { current, longest, atRisk };
}
