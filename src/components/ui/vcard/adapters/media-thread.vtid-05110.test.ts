/**
 * VTID-05110 — Media Hub and inbox adapters: data → VCard slots, and the inbox
 * list order (must equal the legacy Messages.tsx order exactly).
 */
import { describe, expect, it } from 'vitest';
import {
  formatMediaDuration,
  joinMeta,
  musicArtist,
  musicTrackToVCard,
  podcastHost,
  podcastToVCard,
  shortToVCard,
} from './media';
import { filterThreads, lastMessageSenderName, orderThreadsForList, threadCounterpartId, threadToVCard, type InboxThreadLike } from './thread';

describe('VTID-05110 media adapters', () => {
  it('formats durations as m:ss and drops empty values', () => {
    expect(formatMediaDuration(65)).toBe('1:05');
    expect(formatMediaDuration(3599.9)).toBe('59:59');
    expect(formatMediaDuration(0)).toBeUndefined();
    expect(formatMediaDuration(null)).toBeUndefined();
    expect(joinMeta('a', undefined, '', 'b')).toBe('a · b');
    expect(joinMeta(undefined, false)).toBeUndefined();
  });

  it('maps a short to a portrait spotlight card; a missing thumbnail becomes a placeholder', () => {
    const card = shortToVCard({ id: 's1', title: 'Stretch', creator: 'Ana', duration: '0:45', src_url: 'v.mp4', thumbnail_url: 't.jpg', tags: ['Yoga', 'Fitness', 'X'] });
    expect(card).toMatchObject({ key: 's1', title: 'Stretch', eyebrow: 'Ana', media: { src: 't.jpg', ratio: 'portrait' } });
    expect(card.meta).toBe('0:45 · Yoga · Fitness');
    const bare = shortToVCard({ id: 's2', title: 'T', creator: 'C', duration: '0:00', src_url: 'v.mp4', thumbnail_url: null });
    expect(bare.media?.src).toBeNull();
    expect(bare.meta).toBeUndefined();
  });

  it('reads music metadata whether PostgREST returned the embed as an object or an array', () => {
    const asObject = { id: 'm1', title: 'Rain', file_url: 'a.mp3', duration: 125, music_metadata: { artist_name: 'Lia', genre: 'Ambient' } };
    const asArray = { ...asObject, music_metadata: [{ artist_name: 'Lia', genre: 'Ambient' }] };
    expect(musicArtist(asObject)).toBe('Lia');
    expect(musicArtist(asArray)).toBe('Lia');
    expect(musicTrackToVCard(asObject, 'Unknown')).toMatchObject({ eyebrow: 'Ambient', meta: 'Lia · 2:05' });
    expect(musicTrackToVCard({ id: 'm2', title: 'X', file_url: 'b.mp3' }, 'Unknown').meta).toBe('Unknown');
  });

  it('maps a podcast episode with its host and series', () => {
    const ep = { id: 'p1', title: 'Sleep', file_url: 'p.mp3', thumbnail_url: 'c.jpg', duration: 600, podcast_metadata: [{ host_name: 'Dr. K', series_name: 'Longevity' }] };
    expect(podcastToVCard(ep, '?')).toMatchObject({ key: 'p1', eyebrow: 'Longevity', meta: 'Dr. K · 10:00', media: { src: 'c.jpg' } });
    expect(podcastHost({ id: 'p2', title: 'T', file_url: 'x', podcast_metadata: null }, 'Unknown host')).toBe('Unknown host');
  });
});

const me = 'me';
const dm = (id: string, other: string, updated: string, extra: Partial<InboxThreadLike> = {}): InboxThreadLike => ({
  id,
  type: 'direct',
  updated_at: updated,
  participants: [{ user_id: me }, { user_id: other, display_name: other.toUpperCase() }],
  ...extra,
});
const group = (id: string, updated: string, unread = 0): InboxThreadLike => ({
  id,
  type: 'group',
  name: `Group ${id}`,
  updated_at: updated,
  unread_count: unread,
  participants: [{ user_id: me }, { user_id: 'x', display_name: 'Xena' }],
});

describe('VTID-05110 thread adapters', () => {
  const threads = [
    dm('d-old', 'anna', '2026-10-01T10:00:00Z'),
    dm('d-new', 'anna', '2026-10-05T10:00:00Z'),
    dm('d-ben', 'ben', '2026-10-03T10:00:00Z'),
    group('g1', '2026-10-02T10:00:00Z', 0),
    group('g2', '2026-09-01T10:00:00Z', 3),
  ];

  it('"all": newest first, one direct thread per counterpart, pinned on top', () => {
    expect(orderThreadsForList(threads, 'all', new Set(), me).map((t) => t.id)).toEqual(['d-new', 'd-ben', 'g1', 'g2']);
    expect(orderThreadsForList(threads, 'all', new Set(['g2']), me).map((t) => t.id)).toEqual(['g2', 'd-new', 'd-ben', 'g1']);
  });

  it('"groups": pinned, then unread, then newest; "direct": deduped; "contacts": no threads', () => {
    expect(orderThreadsForList(threads, 'groups', new Set(), me).map((t) => t.id)).toEqual(['g2', 'g1']);
    expect(orderThreadsForList(threads, 'direct', new Set(), me).map((t) => t.id)).toEqual(['d-new', 'd-ben']);
    expect(filterThreads(threads, 'contacts')).toEqual([]);
  });

  it('maps a thread to a row card with the counterpart, last message and group sender', () => {
    const card = threadToVCard(dm('d1', 'anna', '2026-10-05T10:00:00Z', { last_message: { body: ' Hi! ', sender_id: 'anna' } }), me, 'Untitled');
    expect(card).toMatchObject({ key: 'd1', title: 'ANNA', meta: 'Hi!' });
    const g = { ...group('g3', '2026-10-05T10:00:00Z'), last_message: { body: 'See you', sender_id: 'x' } };
    expect(lastMessageSenderName(g, me)).toBe('Xena');
    expect(threadToVCard(g, me, 'Untitled')).toMatchObject({ title: 'Group g3', meta: 'Xena: See you', media: { src: null } });
    expect(threadToVCard({ id: 'z', updated_at: '2026-10-05T10:00:00Z' }, me, 'Untitled').title).toBe('Untitled');
    expect(threadCounterpartId(threads[2], me)).toBe('ben');
    expect(threadCounterpartId(group('g', '2026-10-05T10:00:00Z'), me)).toBeUndefined();
  });
});
