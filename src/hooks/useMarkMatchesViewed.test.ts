/**
 * VTID-04827: daily_matches.viewed_at is written when the member sees their
 * matches. Mocked Supabase client — no real writes (CLAUDE.md: never write
 * to production, not even as the test account).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const calls: Array<[string, ...unknown[]]> = [];
let updateError: { message: string } | null = null;
let currentUser: { id: string } | null = { id: 'me' };

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  for (const m of ['update', 'eq', 'in', 'is', 'gt']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => void) => resolve({ error: updateError });
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: currentUser } }) },
      from: (table: string) => {
        calls.push(['from', table]);
        return builder;
      },
    },
  };
});

import { markMatchesViewed } from './useMarkMatchesViewed';

beforeEach(() => {
  calls.length = 0;
  updateError = null;
  currentUser = { id: 'me' };
});

describe('markMatchesViewed', () => {
  it("sets viewed_at only on the member's own live, unseen rows for the shown matches", async () => {
    await markMatchesViewed(['u1', 'u2']);
    const names = calls.map((c) => c[0]);
    expect(names).toEqual(['from', 'update', 'eq', 'in', 'is', 'gt']);
    expect(calls[0]).toEqual(['from', 'daily_matches']);
    expect(Object.keys(calls[1][1] as object)).toEqual(['viewed_at']);
    expect(calls[2]).toEqual(['eq', 'user_id', 'me']);
    expect(calls[3]).toEqual(['in', 'matched_user_id', ['u1', 'u2']]);
    expect(calls[4]).toEqual(['is', 'viewed_at', null]);
    expect(calls[5][1]).toBe('expires_at');
  });

  it('does nothing without matches or without a signed-in member', async () => {
    await markMatchesViewed([]);
    currentUser = null;
    await markMatchesViewed(['u1']);
    expect(calls).toEqual([]);
  });

  it('logs a failed update instead of throwing', async () => {
    updateError = { message: 'rls' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(markMatchesViewed(['u1'])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[useMarkMatchesViewed] marking matches viewed failed:', 'rls');
    warn.mockRestore();
  });
});

describe('wiring', () => {
  it('the Matches page and the My Journey preview mark the cards they show', () => {
    for (const f of ['../pages/MatchesPage.tsx', '../components/journey/MatchesPreview.tsx']) {
      const src = readFileSync(join(__dirname, f), 'utf8');
      expect(src).toContain('useMarkMatchesViewed(list.map((m) => m.user_id));');
    }
  });
});
