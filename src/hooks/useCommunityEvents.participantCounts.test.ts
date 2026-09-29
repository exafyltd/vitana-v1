import { beforeEach, describe, expect, it, vi } from 'vitest';

// VTID-04594: PostgREST aggregates are disabled on the project, so the
// `count()` attempt returned 400 on every events load. Counts come from the
// per-row fetch only.
const selects: string[] = [];
let rows: { data: Array<{ event_id: string }> | null; error: unknown } = { data: [], error: null };

vi.mock('@/integrations/supabase/client', () => {
  const builder = {
    select(cols: string) {
      selects.push(cols);
      return builder;
    },
    in() {
      return builder;
    },
    eq() {
      return Promise.resolve(rows);
    },
  };
  return { supabase: { from: () => builder } };
});

import { fetchParticipantCounts } from './useCommunityEvents';

describe('fetchParticipantCounts', () => {
  beforeEach(() => {
    selects.length = 0;
  });

  it('never requests the disabled count() aggregate', async () => {
    rows = { data: [], error: null };
    await fetchParticipantCounts(['e1']);
    expect(selects).toEqual(['event_id']);
    expect(selects.some(s => s.includes('count('))).toBe(false);
  });

  it('counts attending rows per event', async () => {
    rows = { data: [{ event_id: 'e1' }, { event_id: 'e2' }, { event_id: 'e1' }], error: null };
    const counts = await fetchParticipantCounts(['e1', 'e2', 'e3']);
    expect(counts.get('e1')).toBe(2);
    expect(counts.get('e2')).toBe(1);
    expect(counts.has('e3')).toBe(false);
  });

  it('returns no counts and makes no request for an empty list', async () => {
    const counts = await fetchParticipantCounts([]);
    expect(counts.size).toBe(0);
    expect(selects).toHaveLength(0);
  });

  it('returns empty counts when the row fetch fails', async () => {
    rows = { data: null, error: { message: 'boom' } };
    const counts = await fetchParticipantCounts(['e1']);
    expect(counts.size).toBe(0);
  });
});
