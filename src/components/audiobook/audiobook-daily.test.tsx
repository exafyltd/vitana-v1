/**
 * VTID-04763 — Audiobook daily habit and measurement (frontend).
 *
 * Pins: player events reach product analytics as audiobook_* with
 * snake_case properties; a listen carries the member's local day; the daily
 * goal is one episode; the reminder control saves a time in the member's
 * time zone (or switches off); Home plays today's episode in one tap; the
 * push deep link is a plain path known to the router and the registry.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackCalls: Array<[string, unknown]> = [];
vi.mock('@/lib/product-analytics/client', () => ({
  track: (name: string, opts: unknown) => trackCalls.push([name, opts]),
}));
const fetchCalls: Array<{ path: string; body?: string }> = [];
vi.mock('@/lib/community-gateway', () => ({
  communityFetch: async (p: string, init?: RequestInit) => {
    fetchCalls.push({ path: p, body: init?.body as string | undefined });
    const body =
      p === '/api/v1/journey/state'
        ? { ok: true, state: { currentSession: 3, audiobookReminder: { time: '08:00', tz: 'Europe/Berlin' } } }
        : { ok: true };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));

import { emitAudiobookEvent } from '@/lib/audiobook/events';
import { recordSessionListened } from '@/lib/journeyPractice';
import { DAILY_SESSION_GOAL } from '@/hooks/useGuidedJourneyProgress';
import { AudiobookReminderControl } from './AudiobookReminderControl';

const root = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  trackCalls.length = 0;
  fetchCalls.length = 0;
});

describe('measurement', () => {
  it('sends player milestones to product analytics as audiobook_* with snake_case properties', () => {
    emitAudiobookEvent('episode_completed', { episode: 3, chapterId: 'prolog' });
    emitAudiobookEvent('try_it_now', { episode: 3, practiceTarget: 'my_journey' });
    expect(trackCalls).toEqual([
      ['audiobook_episode_completed', { event_type: 'feature', feature_key: 'audiobook', properties: { episode: 3, chapter_id: 'prolog' } }],
      ['audiobook_try_it_now', { event_type: 'feature', feature_key: 'audiobook', properties: { episode: 3, practice_target: 'my_journey' } }],
    ]);
  });

  it('emits exactly the event names the gateway metrics read (audiobook-metrics.ts in vitana-platform)', () => {
    for (const name of ['play_started', 'track_started', 'track_completed', 'episode_completed', 'try_it_now', 'ask_vitana'] as const) {
      emitAudiobookEvent(name, {});
    }
    expect(trackCalls.map(([n]) => n)).toEqual([
      'audiobook_play_started',
      'audiobook_track_started',
      'audiobook_track_completed',
      'audiobook_episode_completed',
      'audiobook_try_it_now',
      'audiobook_ask_vitana',
    ]);
  });
});

describe('one episode a day', () => {
  it('the daily goal is one episode', () => {
    expect(DAILY_SESSION_GOAL).toBe(1);
  });

  it("a listen carries the member's own calendar day", async () => {
    await recordSessionListened(4, 'T255');
    const body = JSON.parse(fetchCalls.find((c) => c.path === '/api/v1/journey/session-listened')!.body!);
    expect(body.session).toBe(4);
    expect(body.topicId).toBe('T255');
    expect(body.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daily reminder control', () => {
  it('shows the saved time and saves a new one in the local time zone', async () => {
    wrap(<AudiobookReminderControl />);
    const select = (await screen.findByTestId('audiobook-reminder-select')) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('08:00'));
    fireEvent.change(select, { target: { value: '18:00' } });
    await waitFor(() => expect(fetchCalls.some((c) => c.path === '/api/v1/journey/audiobook/reminder')).toBe(true));
    const body = JSON.parse(fetchCalls.find((c) => c.path === '/api/v1/journey/audiobook/reminder')!.body!);
    expect(body.time).toBe('18:00');
    expect(typeof body.tz).toBe('string');
    expect(body.tz.length).toBeGreaterThan(0);
  });

  it('switches off', async () => {
    wrap(<AudiobookReminderControl />);
    const select = (await screen.findByTestId('audiobook-reminder-select')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'off' } });
    await waitFor(() => expect(fetchCalls.some((c) => c.path === '/api/v1/journey/audiobook/reminder')).toBe(true));
    expect(JSON.parse(fetchCalls.find((c) => c.path === '/api/v1/journey/audiobook/reminder')!.body!)).toEqual({ time: null });
  });

  it('only offers times before 22:00', async () => {
    const { AUDIOBOOK_REMINDER_TIMES } = await import('./AudiobookReminderControl');
    expect(AUDIOBOOK_REMINDER_TIMES.every((t) => t < '22:00')).toBe(true);
  });
});

describe('entry points', () => {
  it('Home plays today\'s episode in one tap', () => {
    const src = read('src/components/home/LongevityJourneyCard.tsx');
    expect(src).toContain('audiobook.start({ episode: nextSession.session })');
    expect(src).toContain('e.stopPropagation()');
  });

  it('the push deep link is a plain path the router and the registry know', () => {
    expect(read('src/App.tsx')).toContain('path="/autopilot/audiobook"');
    const ex = JSON.parse(read('src/navigation/registry/exclusions.json'));
    expect(ex.paths.some((p: { path: string }) => p.path === '/autopilot/audiobook')).toBe(true);
    expect(read('src/pages/AutopilotDashboard.tsx')).toContain("'/autopilot/audiobook'");
  });
});
