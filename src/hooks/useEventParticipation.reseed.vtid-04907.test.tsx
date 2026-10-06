/**
 * VTID-04907 (LR-C) — the event card's join counter follows the list's count
 * (re-seeds when initialCount changes) and the hook never writes the
 * participant_count column (members cannot; counts come from participant rows).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ReactNode } from 'react';

vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: () => {}, from: () => ({}) } };
});
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null, session: null }) }));
vi.mock('@/hooks/useCalendarEvents', () => ({ useCalendarEvents: () => ({ addEvent: vi.fn(), removeEvent: vi.fn() }) }));

import { useEventParticipation } from './useEventParticipation';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

describe('useEventParticipation', () => {
  it('re-seeds the count when initialCount changes', () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const { result, rerender } = renderHook(({ n }) => useEventParticipation(id, n), { wrapper, initialProps: { n: 2 } });
    expect(result.current.participantCount).toBe(2);
    rerender({ n: 7 });
    expect(result.current.participantCount).toBe(7);
  });

  it('never writes global_community_events', () => {
    const src = readFileSync(join(__dirname, 'useEventParticipation.ts'), 'utf8');
    expect(src).not.toMatch(/\.from\('global_community_events'\)/);
  });
});
