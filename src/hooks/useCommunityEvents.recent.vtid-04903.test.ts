import { beforeEach, describe, expect, it, vi } from 'vitest';

// VTID-04903 / VTID-04902 — the events list also reads recently created
// upcoming events (a new event beyond the 100 nearest was never loaded), and a
// deep link can fetch one event by id or slug with the same enrichment.

type Call = { table: string; ops: Array<[string, unknown[]]> };
const calls: Call[] = [];
let responder: (c: Call) => { data: unknown; error: unknown } = () => ({ data: [], error: null });

vi.mock('@/integrations/supabase/client', () => {
  const make = (table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const b: Record<string, unknown> = {};
    for (const op of ['select', 'gte', 'order', 'limit', 'in', 'eq', 'or']) {
      b[op] = (...args: unknown[]) => {
        call.ops.push([op, args]);
        return b;
      };
    }
    b.maybeSingle = () => {
      call.ops.push(['maybeSingle', []]);
      return Promise.resolve(responder(call));
    };
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(responder(call)).then(res, rej);
    return b;
  };
  return {
    supabase: {
      from: (t: string) => make(t),
      auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'me' } } } }) },
    },
  };
});

import { fetchCommunityEventsQueryFn, fetchCommunityEventByIdOrSlug } from './useCommunityEvents';

const row = (id: string, start: string, extra: Record<string, unknown> = {}) => ({
  id,
  title: id,
  created_by: 'mariia',
  created_at: '2026-10-05T10:00:00Z',
  start_time: start,
  ...extra,
});

const isRecentRead = (c: Call) => c.table === 'global_community_events' && c.ops.some(([op, a]) => op === 'gte' && a[0] === 'created_at');

describe('fetchCommunityEventsQueryFn (VTID-04903)', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('merges the recently created read so an event beyond the nearest 100 is loaded once', async () => {
    responder = (c) => {
      if (c.table === 'global_community_events') {
        return isRecentRead(c)
          ? { data: [row('far-new', '2027-03-01T18:00:00Z'), row('near', '2026-10-06T18:00:00Z')], error: null }
          : { data: [row('near', '2026-10-06T18:00:00Z')], error: null };
      }
      if (c.table === 'global_event_participants') return { data: [{ event_id: 'far-new' }], error: null };
      if (c.table === 'global_community_profiles') return { data: [{ user_id: 'mariia', display_name: 'Mariia', avatar_url: null }], error: null };
      return { data: [], error: null };
    };
    const events = await fetchCommunityEventsQueryFn();
    expect(events.map((e) => e.id)).toEqual(['near', 'far-new']);
    expect(events.find((e) => e.id === 'far-new')).toMatchObject({ participant_count: 1, creator_display_name: 'Mariia' });
    expect(calls.filter(isRecentRead)).toHaveLength(1);
  });

  it('still loads the nearest events when the recent read fails', async () => {
    responder = (c) => {
      if (isRecentRead(c)) return { data: null, error: { message: 'boom' } };
      if (c.table === 'global_community_events') return { data: [row('near', '2026-10-06T18:00:00Z')], error: null };
      return { data: [], error: null };
    };
    const events = await fetchCommunityEventsQueryFn();
    expect(events.map((e) => e.id)).toEqual(['near']);
  });
});

describe('fetchCommunityEventByIdOrSlug (VTID-04902)', () => {
  beforeEach(() => {
    calls.length = 0;
    responder = (c) => {
      if (c.table === 'global_community_events') return { data: row('e1', '2027-01-01T18:00:00Z', { slug: 'sommerfest' }), error: null };
      if (c.table === 'global_community_profiles') return { data: [{ user_id: 'mariia', display_name: 'Mariia', avatar_url: null }], error: null };
      return { data: [], error: null };
    };
  });

  it('looks a slug up by slug and returns the enriched event', async () => {
    const e = await fetchCommunityEventByIdOrSlug('sommerfest');
    const read = calls.find((c) => c.table === 'global_community_events')!;
    expect(read.ops).toContainEqual(['eq', ['slug', 'sommerfest']]);
    expect(e).toMatchObject({ id: 'e1', creator_display_name: 'Mariia', participant_count: 0 });
  });

  it('looks a uuid up by id', async () => {
    await fetchCommunityEventByIdOrSlug('6bb46db6-a3ba-42b6-8a50-2be8658e436f');
    const read = calls.find((c) => c.table === 'global_community_events')!;
    expect(read.ops).toContainEqual(['eq', ['id', '6bb46db6-a3ba-42b6-8a50-2be8658e436f']]);
  });

  it('returns null when nothing is found', async () => {
    responder = () => ({ data: null, error: null });
    expect(await fetchCommunityEventByIdOrSlug('missing')).toBeNull();
  });
});
