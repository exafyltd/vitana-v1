import { describe, expect, it } from 'vitest';
import { GROUP_WINDOW_MS, groupPositions, isGroupEnd, isGroupStart, startsNewGroup } from './grouping';

// Local wall-clock times, so the day-change case holds in every time zone.
const at = (day: number, h: number, m: number, s = 0) => new Date(2026, 9, day, h, m, s).toISOString();
const msg = (id: string, sender: string, created_at: string, extra: Record<string, unknown> = {}) => ({
  id,
  sender_id: sender,
  created_at,
  message_type: 'text',
  ...extra,
});

describe('message grouping (VTID-05314)', () => {
  it('groups consecutive messages of one sender: first, middle, last', () => {
    const list = [
      msg('1', 'a', at(21, 10, 0)),
      msg('2', 'a', at(21, 10, 1)),
      msg('3', 'a', at(21, 10, 2)),
    ];
    expect(groupPositions(list)).toEqual(['first', 'middle', 'last']);
  });

  it('a sender change starts a new group', () => {
    const list = [
      msg('1', 'a', at(21, 10, 0)),
      msg('2', 'a', at(21, 10, 1)),
      msg('3', 'b', at(21, 10, 1)),
      msg('4', 'a', at(21, 10, 2)),
    ];
    expect(groupPositions(list)).toEqual(['first', 'last', 'single', 'single']);
  });

  it('exactly five minutes still groups; more than five minutes breaks', () => {
    const base = new Date(2026, 9, 21, 10, 0).getTime();
    const list = [
      msg('1', 'a', new Date(base).toISOString()),
      msg('2', 'a', new Date(base + GROUP_WINDOW_MS).toISOString()),
      msg('3', 'a', new Date(base + 2 * GROUP_WINDOW_MS + 1000).toISOString()),
    ];
    expect(groupPositions(list)).toEqual(['first', 'last', 'single']);
  });

  it('a day change breaks the group even within five minutes', () => {
    const list = [msg('1', 'a', at(21, 23, 58)), msg('2', 'a', at(22, 0, 1))];
    expect(groupPositions(list)).toEqual(['single', 'single']);
  });

  it('a system notice is never part of a group and splits the senders around it', () => {
    const list = [
      msg('1', 'a', at(21, 10, 0)),
      msg('2', 'a', at(21, 10, 0, 30), { message_type: 'system' }),
      msg('3', 'a', at(21, 10, 1)),
    ];
    expect(groupPositions(list)).toEqual(['single', 'single', 'single']);
  });

  it('a reply stays in the group', () => {
    const list = [
      msg('1', 'a', at(21, 10, 0)),
      msg('2', 'a', at(21, 10, 1), { reply_to_message_id: 'x', parent_message_id: 'x' }),
      msg('3', 'a', at(21, 10, 2)),
    ];
    expect(groupPositions(list)).toEqual(['first', 'middle', 'last']);
  });

  it('a divider the caller places (unread) starts a new group', () => {
    const list = [
      msg('1', 'a', at(21, 10, 0)),
      msg('2', 'a', at(21, 10, 1)),
      msg('3', 'a', at(21, 10, 2)),
    ];
    expect(groupPositions(list, { breakBefore: (m) => m.id === '2' })).toEqual(['single', 'first', 'last']);
  });

  it('reads the sender from sender.user_id when sender_id is missing; unknown senders never group', () => {
    const list = [
      { id: '1', sender: { user_id: 'a' }, created_at: at(21, 10, 0) },
      { id: '2', sender: { user_id: 'a' }, created_at: at(21, 10, 1) },
      { id: '3', created_at: at(21, 10, 2) },
      { id: '4', created_at: at(21, 10, 2) },
    ];
    expect(groupPositions(list as never)).toEqual(['first', 'last', 'single', 'single']);
  });

  it('empty and single lists', () => {
    expect(groupPositions([])).toEqual([]);
    expect(groupPositions([msg('1', 'a', at(21, 10, 0))])).toEqual(['single']);
    expect(startsNewGroup(null, msg('1', 'a', at(21, 10, 0)))).toBe(true);
  });

  it('start/end helpers: no position behaves as a single bubble', () => {
    expect([undefined, 'single', 'first', 'middle', 'last'].map((p) => isGroupStart(p as never))).toEqual([
      true, true, true, false, false,
    ]);
    expect([undefined, 'single', 'first', 'middle', 'last'].map((p) => isGroupEnd(p as never))).toEqual([
      true, true, false, false, true,
    ]);
  });
});
