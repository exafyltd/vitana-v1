import { describe, it, expect } from 'vitest';
import {
  getMessageDateKey,
  getDateSeparatedMessageItems,
} from './messageDateSeparators';

describe('getMessageDateKey', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(getMessageDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(getMessageDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('returns an empty string for invalid dates', () => {
    expect(getMessageDateKey(new Date('not-a-date'))).toBe('');
    expect(getMessageDateKey(undefined as unknown as Date)).toBe('');
  });
});

describe('getDateSeparatedMessageItems', () => {
  type Msg = { id: string; created_at: string; body?: string };
  const label = (d: Date) => getMessageDateKey(d);

  it('inserts a separator before the first message of each day', () => {
    const messages: Msg[] = [
      { id: 'a', created_at: '2026-07-01T08:00:00Z' },
      { id: 'b', created_at: '2026-07-01T09:30:00Z' },
      { id: 'c', created_at: '2026-07-02T10:00:00Z' },
    ];
    const items = getDateSeparatedMessageItems(messages, (m) => m.created_at, label);

    expect(items.map((i) => i.type)).toEqual([
      'date',
      'message',
      'message',
      'date',
      'message',
    ]);
    const separators = items.filter((i) => i.type === 'date');
    expect(new Set(separators.map((s) => s.dateKey)).size).toBe(2);
  });

  it('skips separators for messages with unparseable timestamps', () => {
    const messages: Msg[] = [{ id: 'a', created_at: 'garbage' }];
    const items = getDateSeparatedMessageItems(messages, (m) => m.created_at, label);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('message');
  });

  it('returns an empty list for no messages', () => {
    expect(getDateSeparatedMessageItems([], () => '', label)).toEqual([]);
  });

  it('keeps stable ids for messages and separators', () => {
    const messages: Msg[] = [{ id: 'a', created_at: '2026-07-01T08:00:00Z' }];
    const items = getDateSeparatedMessageItems(messages, (m) => m.created_at, label);
    expect(items[0].id).toMatch(/^date-2026-07-01$/);
    expect(items[1].id).toBe('message-a');
  });
});
