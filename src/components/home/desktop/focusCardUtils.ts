/**
 * VTID-05108 — shared helpers for the desktop News focus feed (Spotlight on).
 */
import type { KeyboardEvent } from 'react';
import type { VCardSize } from '@/components/ui/vcard';
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { formatDistanceToNow } from '@/lib/locale-format';

export type StageCardSize = Extract<VCardSize, 'spotlight' | 'standard'>;

export interface StageCardState {
  size: StageCardSize;
  focused: boolean;
  dimmed: boolean;
}

/** `standard` stage cards: a horizontal row, 4:3 media at the inline start (40 % wide). */
export const STANDARD_ROW_CLASS = 'flex-row items-start [&>[data-vcard-media]]:w-2/5 [&>[data-vcard-media]]:shrink-0';

/** The matching skeleton shape (VCardSkeleton's first child is its media box). */
export const STANDARD_ROW_SKELETON_CLASS = 'flex-row items-start [&>:first-child]:w-2/5 [&>:first-child]:shrink-0';

/** Hover lift + keyboard focus ring for a card that opens something. */
export const INTERACTIVE_CARD_CLASS =
  'cursor-pointer transition-shadow hover:shadow-vcard-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/** Click + Enter/Space on the card itself (never on a control inside it). */
export function activateProps(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Side sheets open from the inline-end side (away from the ORB), mirrored in RTL. */
export function inlineEndSide(): 'left' | 'right' {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'left' : 'right';
}

/** Today's community events that have not ended yet, soonest first (local day). */
export function todaysEvents(events: CommunityEvent[], now: Date, limit = 3): CommunityEvent[] {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  return events
    .filter((e) => {
      const start = new Date(e.start_time);
      if (Number.isNaN(start.getTime()) || start < startOfDay || start >= endOfDay) return false;
      // No end time: it is today's event for the whole day.
      return !e.end_time || new Date(e.end_time) >= now;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, limit);
}
