/**
 * VTID-05461 — native twin of `src/hooks/useVitanaStreaks.ts` as the
 * VitanaIndexChip reads it (MobileActionChips.tsx:19-20): the consecutive
 * local days with an Index-lifting activity, from the same device store
 * (`vitana:streak:active-days`, `{ days: YYYY-MM-DD[], longest }`) in the
 * native key-value store, credited on `vitana:index-lifted` (overlay bus, the
 * web window event name) and re-read at local midnight.
 *
 * Not wired, recorded in verification.md: the web hook's streak-milestone and
 * at-risk celebrations (useVitanaStreaks.ts:127-160). Both only fire after a
 * `vitana:index-lifted` credit (the at-risk nudge needs yesterday in the
 * store), and that event comes from the web lift watcher
 * (src/lib/celebrate.ts:301, :457), which has no native emitter yet.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { overlayBus } from '../../../navigation/overlay-bus';

export const STREAK_STORE_KEY = 'vitana:streak:active-days';
export const INDEX_LIFTED_EVENT = 'vitana:index-lifted';

interface StreakStore {
  days: string[];
  longest: number;
}

/** Local calendar day-key (useVitanaStreaks.ts:20-25). */
export function localDayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parse(raw: string | null): StreakStore {
  if (!raw) return { days: [], longest: 0 };
  try {
    const parsed = JSON.parse(raw) as Partial<StreakStore>;
    return { days: Array.isArray(parsed.days) ? parsed.days : [], longest: typeof parsed.longest === 'number' ? parsed.longest : 0 };
  } catch {
    return { days: [], longest: 0 };
  }
}

function consecutiveStreak(days: Set<string>, today: Date): number {
  let count = 0;
  const cursor = new Date(today);
  while (days.has(localDayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function useVitanaStreaks(): { current: number; longest: number } {
  const [store, setStore] = useState<StreakStore>({ days: [], longest: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STREAK_STORE_KEY)
      .then((raw) => {
        if (alive) setStore(parse(raw));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tick]);

  const recordToday = useCallback(async () => {
    const current = parse(await AsyncStorage.getItem(STREAK_STORE_KEY).catch(() => null));
    const today = localDayKey();
    if (current.days.includes(today)) return;
    const set = new Set([...current.days, today]);
    const next = { days: [...set].sort().slice(-60), longest: Math.max(current.longest, consecutiveStreak(set, new Date())) };
    await AsyncStorage.setItem(STREAK_STORE_KEY, JSON.stringify(next)).catch(() => undefined);
    setTick((n) => n + 1);
  }, []);

  useEffect(() => overlayBus.on(INDEX_LIFTED_EVENT, () => void recordToday()), [recordToday]);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 5, 0);
    const id = setTimeout(() => setTick((n) => n + 1), midnight.getTime() - now.getTime());
    return () => clearTimeout(id);
  }, [tick]);

  const current = consecutiveStreak(new Set(store.days), new Date());
  return { current, longest: Math.max(store.longest, current) };
}
