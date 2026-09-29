/**
 * What Vitana suggests at the top of today's calendar (VTID-04536).
 *
 * One suggestion, never a list: the first rule that applies wins. The rules
 * read only what the calendar already knows — today's entries, the open
 * journey steps and whether a calendar app is connected — so the card is
 * instant and never needs its own request.
 */
import { isDone } from "./theme";
import type { CalendarWindowItem } from "@/lib/calendar-window-client";

export type Guidance =
  | { kind: "allDone"; count: number }
  | { kind: "nextStep"; title: string; openCount: number; stepId: string }
  | { kind: "freeDay" }
  | { kind: "freeWindow"; from: Date; to: Date }
  | { kind: "connect" }
  | { kind: "busy"; count: number };

export interface GuidanceInput {
  now: Date;
  /** Today's own entries (not busy blocks, not work items). */
  today: CalendarWindowItem[];
  /** Open journey steps, oldest first. */
  openSteps: { id: string; title: string }[];
  /** null while the connection state is still loading. */
  calendarConnected: boolean | null;
}

/** A gap of at least this long between now and the evening counts as free time. */
export const FREE_WINDOW_MIN = 120;
/** Free windows end here; later gaps are evening, not a suggestion slot. */
export const DAY_END_HOUR = 21;
/** From this many entries still ahead, the day counts as busy. */
export const BUSY_FROM = 6;

function endOf(item: CalendarWindowItem): number {
  const start = Date.parse(item.start_time);
  const end = item.end_time ? Date.parse(item.end_time) : NaN;
  return Number.isFinite(end) && end > start ? end : start + 30 * 60_000;
}

/** The longest gap of at least FREE_WINDOW_MIN between now and DAY_END_HOUR, or null. */
export function largestFreeWindow(now: Date, today: CalendarWindowItem[]): { from: Date; to: Date } | null {
  const dayEnd = new Date(now);
  dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);
  if (now.getTime() >= dayEnd.getTime()) return null;

  const blocks = today
    .map((i) => [Date.parse(i.start_time), endOf(i)] as const)
    .filter(([s, e]) => e > now.getTime() && s < dayEnd.getTime())
    .sort((a, b) => a[0] - b[0]);

  let cursor = now.getTime();
  let best: { from: number; to: number } | null = null;
  const consider = (from: number, to: number) => {
    if (to - from >= FREE_WINDOW_MIN * 60_000 && (!best || to - from > best.to - best.from)) best = { from, to };
  };
  for (const [s, e] of blocks) {
    consider(cursor, Math.min(s, dayEnd.getTime()));
    cursor = Math.max(cursor, e);
  }
  consider(cursor, dayEnd.getTime());
  if (!best) return null;
  const { from, to } = best as { from: number; to: number };
  // Start on a round quarter hour so the suggestion reads like a real slot.
  const q = 15 * 60_000;
  const rounded = Math.ceil(from / q) * q;
  return to - rounded >= FREE_WINDOW_MIN * 60_000 ? { from: new Date(rounded), to: new Date(to) } : null;
}

export function pickGuidance({ now, today, openSteps, calendarConnected }: GuidanceInput): Guidance | null {
  const own = today.filter((i) => i.event && !i.busy && !i.work);
  const done = own.filter((i) => isDone(i.event!));

  if (own.length > 0 && done.length === own.length) return { kind: "allDone", count: own.length };

  if (openSteps.length > 0) {
    return { kind: "nextStep", title: openSteps[0].title, openCount: openSteps.length, stepId: openSteps[0].id };
  }

  if (own.length === 0) return { kind: "freeDay" };

  const window = largestFreeWindow(now, own.filter((i) => !isDone(i.event!)));
  if (window) return { kind: "freeWindow", ...window };

  if (calendarConnected === false) return { kind: "connect" };

  const ahead = own.filter((i) => !isDone(i.event!) && endOf(i) > now.getTime());
  if (ahead.length >= BUSY_FROM) return { kind: "busy", count: ahead.length };

  return null;
}
