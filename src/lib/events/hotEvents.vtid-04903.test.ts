import { describe, it, expect } from 'vitest';
import { selectHotEvents, CURATED_CREATOR_ID } from './hotEvents';

// VTID-04903 — Hot used to show only one hardcoded account's events, so a
// member's new event never appeared on the default Events tab.
const NOW = new Date('2026-10-05T20:00:00Z');
const h = (hours: number) => new Date(NOW.getTime() + hours * 3600_000).toISOString();

const ev = (id: string, o: Partial<{ created_by: string; created_at: string; start_time: string; end_time: string | null; participant_count: number }> = {}) => ({
  id,
  created_by: o.created_by ?? `member-${id}`,
  created_at: o.created_at ?? h(-24 * 30),
  start_time: o.start_time ?? h(48),
  end_time: o.end_time ?? null,
  participant_count: o.participant_count ?? 0,
});

describe('selectHotEvents', () => {
  it("includes a member's event (Mariia's case) — Hot is not only the curated account", () => {
    const out = selectHotEvents([ev('m1')], NOW);
    expect(out.map((e) => e.id)).toEqual(['m1']);
  });

  it('orders curated first, then fresh member events, then by participants', () => {
    const out = selectHotEvents(
      [
        ev('old-popular', { participant_count: 12 }),
        ev('old-quiet', { participant_count: 1, start_time: h(5) }),
        ev('fresh', { created_at: h(-2), start_time: h(24 * 20) }),
        ev('curated', { created_by: CURATED_CREATOR_ID, start_time: h(72) }),
        ev('pinned', { start_time: h(10) }),
      ].map((e) => (e.id === 'pinned' ? { ...e, id: '6bb46db6-a3ba-42b6-8a50-2be8658e436f' } : e)),
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual([
      '6bb46db6-a3ba-42b6-8a50-2be8658e436f',
      'curated',
      'fresh',
      'old-popular',
      'old-quiet',
    ]);
  });

  it('drops events the moment they end, using end_time when present', () => {
    const out = selectHotEvents(
      [
        ev('ended', { start_time: h(-3), end_time: h(-1) }),
        ev('running', { start_time: h(-1), end_time: h(1) }),
        ev('started-no-end', { start_time: h(-1) }),
      ],
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(['running']);
  });

  it('keeps every other field (no event_type override)', () => {
    const meetup = { ...ev('m'), event_type: 'meetup' };
    expect(selectHotEvents([meetup], NOW)[0].event_type).toBe('meetup');
  });
});

describe('selectHotEvents — Live Rooms (VTID-04907)', () => {
  it('puts rooms that are live now first, most viewers first, even past their planned end', () => {
    const out = selectHotEvents(
      [
        ev('curated', { created_by: CURATED_CREATOR_ID, start_time: h(2) }),
        { ...ev('room-small', { start_time: h(-3), end_time: h(-2), participant_count: 2 }), metadata: { is_live: true } },
        { ...ev('room-big', { start_time: h(-1), end_time: h(1), participant_count: 9 }), metadata: { is_live: true } },
        { ...ev('room-later', { start_time: h(5), end_time: h(6) }), metadata: { is_live: false } },
      ],
      NOW,
    );
    expect(out.map((e) => e.id)).toEqual(['room-big', 'room-small', 'curated', 'room-later']);
  });

  it('keeps a due room (start passed, host not started yet)', () => {
    const due = { ...ev('due', { start_time: h(-3), end_time: h(-2) }), metadata: { is_due: true } };
    expect(selectHotEvents([due], NOW).map((e) => e.id)).toEqual(['due']);
  });
});
