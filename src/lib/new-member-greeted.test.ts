import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Record<string, unknown[]> = {};
let result: { data: unknown; error: unknown } = { data: [], error: null };
function builder() {
  const b: any = {};
  for (const m of ['select', 'eq', 'is', 'in']) b[m] = vi.fn((...a: unknown[]) => { calls[m] = a; return b; });
  b.limit = vi.fn(() => Promise.resolve(result));
  return b;
}
const fromMock = vi.fn((_table: string) => builder());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (t: string) => fromMock(t) } }));

import { fetchGreetedMemberIds } from './new-member-greeted';

describe('fetchGreetedMemberIds (VTID-04590)', () => {
  beforeEach(() => { fromMock.mockClear(); for (const k of Object.keys(calls)) delete calls[k]; result = { data: [], error: null }; });

  it('counts only direct messages the VIEWER sent to the given members', async () => {
    result = { data: [{ receiver_id: 'amy' }], error: null };
    const set = await fetchGreetedMemberIds('me', ['amy', 'nelson']);
    expect([...set]).toEqual(['amy']);
    expect(fromMock).toHaveBeenCalledWith('chat_messages');
    expect(calls.eq).toEqual(['sender_id', 'me']);
    expect(calls.is).toEqual(['group_id', null]);
    expect(calls.in).toEqual(['receiver_id', ['amy', 'nelson']]);
  });

  it('skips the query with no viewer or no members', async () => {
    expect((await fetchGreetedMemberIds(null, ['amy'])).size).toBe(0);
    expect((await fetchGreetedMemberIds('me', [])).size).toBe(0);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('fails open on error', async () => {
    result = { data: null, error: { message: 'x' } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await fetchGreetedMemberIds('me', ['amy'])).size).toBe(0);
    spy.mockRestore();
  });
});
