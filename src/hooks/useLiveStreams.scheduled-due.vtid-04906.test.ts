/**
 * VTID-04906 (LR-B) — a scheduled room no longer drops out of every list the
 * minute it is due: Scheduled keeps `pending` rooms up to 2h past their start
 * ("starting soon"), so the host can still start it.
 */
import { describe, it, expect, vi } from 'vitest';

const gteCalls: Array<[string, string]> = [];
vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.not = () => builder;
  builder.gte = (col: string, val: string) => { gteCalls.push([col, val]); return builder; };
  builder.order = () => Promise.resolve({ data: [], error: null });
  return { supabase: { from: () => builder } };
});

import { fetchScheduledStreams, isScheduledStreamDue, SCHEDULED_GRACE_MS } from './useLiveStreams';

describe('scheduled rooms that are due', () => {
  it('lists pending rooms up to 2h past their start time', async () => {
    const before = Date.now();
    await fetchScheduledStreams();
    const [col, val] = gteCalls[0];
    expect(col).toBe('scheduled_for');
    const cutoff = new Date(val).getTime();
    expect(SCHEDULED_GRACE_MS).toBe(2 * 60 * 60 * 1000);
    expect(cutoff).toBeLessThanOrEqual(before - SCHEDULED_GRACE_MS + 1000);
    expect(cutoff).toBeGreaterThanOrEqual(before - SCHEDULED_GRACE_MS - 5000);
  });

  it('marks a pending room past its start as due, not a future or live one', () => {
    const now = Date.parse('2026-10-05T12:00:00Z');
    expect(isScheduledStreamDue({ status: 'pending', scheduled_for: '2026-10-05T11:30:00Z' }, now)).toBe(true);
    expect(isScheduledStreamDue({ status: 'pending', scheduled_for: '2026-10-05T12:30:00Z' }, now)).toBe(false);
    expect(isScheduledStreamDue({ status: 'live', scheduled_for: '2026-10-05T11:30:00Z' }, now)).toBe(false);
    expect(isScheduledStreamDue({ status: 'pending', scheduled_for: null }, now)).toBe(false);
  });
});
