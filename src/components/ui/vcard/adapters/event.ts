/**
 * VTID-05110 — community event → VCard slots. Pure (no hooks, no JSX).
 * Cover resolution is the same one the Events list uses on phones
 * (`resolveEventCover`), so a member sees the same picture everywhere.
 */
import type { CommunityEvent } from '@/hooks/useCommunityEvents';
import { resolveEventCover } from '@/lib/eventCoverImage';
import { fmtDate, fmtTime } from '@/lib/locale-format';
import type { VCardData } from './index';

export type EventLike = Pick<CommunityEvent, 'id' | 'title' | 'description' | 'start_time' | 'location'> &
  Partial<Pick<CommunityEvent, 'image_url' | 'updated_at' | 'metadata'>>;

export function eventToVCard(event: EventLike): VCardData {
  const start = new Date(event.start_time);
  const valid = !Number.isNaN(start.getTime());
  const cover = resolveEventCover(event);
  const time = valid ? fmtTime(start, { hour: '2-digit', minute: '2-digit' }) : '';
  return {
    key: event.id,
    media: { src: cover.src, alt: '' },
    eyebrow: valid ? fmtDate(start, { weekday: 'short', day: 'numeric', month: 'short' }) : undefined,
    title: event.title,
    meta: [time, event.location?.trim()].filter(Boolean).join(' · ') || undefined,
    body: event.description?.trim() || undefined,
    href: `/comm/events-meetups?event=${encodeURIComponent(event.id)}`,
  };
}
