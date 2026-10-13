/**
 * VTID-05110 — live room → VCard slots. Pure (no hooks, no JSX). Live rooms
 * show their real listener count; scheduled rooms their real start time.
 * Nothing is invented: a room without a cover gets the neutral placeholder.
 */
import type { LiveRoom } from '@/components/liverooms/LiveRoomCard';
import { t } from '@/lib/i18n-toast';
import { fmtDate, fmtNumber, fmtTime } from '@/lib/locale-format';
import type { VCardData } from './index';

export type LiveRoomLike = Pick<LiveRoom, 'id' | 'title' | 'host' | 'isLive' | 'participants'> &
  Partial<Pick<LiveRoom, 'description' | 'scheduledTime' | 'imageUrl'>>;

export function liveRoomToVCard(room: LiveRoomLike): VCardData {
  let meta: string | undefined;
  if (room.isLive) {
    meta = t('spotlightSocial.liveRooms.listening', { count: fmtNumber(room.participants ?? 0) });
  } else if (room.scheduledTime) {
    const at = new Date(room.scheduledTime);
    if (!Number.isNaN(at.getTime())) {
      meta = `${fmtDate(at, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(at, { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  return {
    key: room.id,
    media: { src: room.imageUrl || null, alt: '' },
    eyebrow: room.host?.name || undefined,
    title: room.title,
    meta,
    body: room.description?.trim() || undefined,
    href: `/comm/live-rooms?live=${encodeURIComponent(room.id)}`,
  };
}
