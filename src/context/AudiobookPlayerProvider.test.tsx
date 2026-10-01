/**
 * VTID-04761 — Audiobook player behaviour.
 *
 * Drives the real provider + mini player against a mocked gateway and a
 * scripted <audio> element: one Play starts at the next unheard episode,
 * topics advance by themselves, every finished topic records the listen,
 * an episode end shows ONE summary card while the next episode keeps
 * playing, and a language without narration offers Vitana instead.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchCalls: Array<{ path: string; body?: string }> = [];
let audioStatus = 200;

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u-1' } }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ selectedLanguage: 'de' }) }));
const activateOrb = vi.fn();
vi.mock('@/lib/orbActivate', () => ({ activateOrb: (...a: unknown[]) => activateOrb(...a) }));

const TOPICS = [
  { topicId: 'T251', session: 1, position: 1, chapterId: 'basics', displayLabel: 'Starte deine Reise', guidedPracticeTarget: null },
  { topicId: 'T252', session: 1, position: 2, chapterId: 'basics', displayLabel: 'Dein Plan', guidedPracticeTarget: 'my_journey' },
  { topicId: 'T001', session: 2, position: 1, chapterId: 'basics', displayLabel: 'Was ist Vitanaland', guidedPracticeTarget: null },
];

vi.mock('@/lib/community-gateway', () => ({
  communityFetch: async (path: string, init?: RequestInit) => {
    fetchCalls.push({ path, body: init?.body as string | undefined });
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    if (path.startsWith('/api/v1/journey-checklist')) return json({ ok: true, topics: TOPICS });
    if (path === '/api/v1/journey/state') return json({ ok: true, state: { currentSession: 1 } });
    if (path === '/api/v1/journey/session-listened') return json({ ok: true, awarded: true });
    if (path.startsWith('/api/v1/journey/audiobook/topics/')) {
      if (audioStatus !== 200) return json({ ok: false, error: 'narration_unavailable' }, audioStatus);
      // jsdom's Blob can't back a Node Response; a minimal stand-in is enough.
      return { ok: true, status: 200, blob: async () => new Blob(['mp3'], { type: 'audio/mpeg' }) } as unknown as Response;
    }
    return json({ ok: false }, 404);
  },
}));

import { AudiobookPlayerProvider, useAudiobookPlayer } from './AudiobookPlayerProvider';
import { AudiobookMiniPlayer } from '@/components/audiobook/AudiobookMiniPlayer';

let audioEl: HTMLAudioElement | null = null;
const playSpy = vi.fn();

function StartButton(props: { episode?: number }) {
  const player = useAudiobookPlayer();
  return (
    <button type="button" onClick={() => void player?.start(props.episode ? { episode: props.episode } : {})}>
      start
    </button>
  );
}

function renderPlayer(episode?: number) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AudiobookPlayerProvider>
          <StartButton episode={episode} />
          <AudiobookMiniPlayer />
        </AudiobookPlayerProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function finishCurrentTrack() {
  await act(async () => {
    audioEl!.dispatchEvent(new Event('ended'));
  });
}

beforeEach(() => {
  fetchCalls.length = 0;
  audioStatus = 200;
  activateOrb.mockReset();
  playSpy.mockReset();
  let n = 0;
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: () => `blob:track-${++n}`,
    revokeObjectURL: () => {},
  }));
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    audioEl = this as HTMLAudioElement;
    playSpy(this.src);
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('pause'));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Audiobook player', () => {
  it('one Play starts at the next unheard episode and needs no microphone', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Starte deine Reise'));
    // The first play() is the silent unlock inside the tap, then the track.
    expect(playSpy.mock.calls[0][0]).toMatch(/^data:audio\/wav;base64,/);
    expect(playSpy).toHaveBeenLastCalledWith('blob:track-1');
    expect(fetchCalls.some((c) => c.path === '/api/v1/journey/audiobook/topics/T251/audio?lang=de')).toBe(true);
    expect(activateOrb).not.toHaveBeenCalled();
  });

  it('the silent unlock ending is not a finished topic', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
    // Simulate the unlock clip's ended event arriving while src is still data:.
    audioEl!.src = 'data:audio/wav;base64,AAAA';
    await act(async () => {
      audioEl!.dispatchEvent(new Event('ended'));
    });
    expect(fetchCalls.some((c) => c.path === '/api/v1/journey/session-listened')).toBe(false);
  });

  it('advances by itself, records each listen, and shows one card per finished episode', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Starte deine Reise'));

    await finishCurrentTrack();
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Dein Plan'));
    expect(screen.queryByTestId('audiobook-episode-summary')).toBeNull();
    const listened = fetchCalls.filter((c) => c.path === '/api/v1/journey/session-listened');
    expect(listened.map((c) => JSON.parse(c.body!))).toEqual([{ session: 1, topicId: 'T251' }]);

    await finishCurrentTrack();
    // Episode 1 done: the summary card shows AND episode 2 is already playing.
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Was ist Vitanaland'));
    expect(screen.getByTestId('audiobook-episode-summary')).toBeTruthy();
    expect(screen.getByTestId('audiobook-try-it-now')).toBeTruthy();
  });

  it('starts a requested episode', async () => {
    renderPlayer(2);
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Was ist Vitanaland'));
  });

  it('cycles speed and the sleep timer', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-speed').textContent).toBe('1×'));
    fireEvent.click(screen.getByTestId('audiobook-speed'));
    expect(screen.getByTestId('audiobook-speed').textContent).toBe('1.25×');
    expect(audioEl!.playbackRate).toBe(1.25);
    fireEvent.click(screen.getByTestId('audiobook-sleep'));
    expect(screen.getByTestId('audiobook-sleep').textContent).toContain('15');
  });

  it('Ask Vitana pauses and opens Vitana on the current topic', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-track-title').textContent).toBe('Starte deine Reise'));
    fireEvent.click(screen.getByTestId('audiobook-ask-vitana'));
    expect(activateOrb).toHaveBeenCalledWith('T251');
  });

  it('a language without narration offers Vitana instead of failing silently', async () => {
    audioStatus = 422;
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-error')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Vitana/ }));
    expect(activateOrb).toHaveBeenCalledWith('T251');
  });

  it('closing hides the player', async () => {
    renderPlayer();
    fireEvent.click(screen.getByText('start'));
    await waitFor(() => expect(screen.getByTestId('audiobook-mini-player')).toBeTruthy());
    fireEvent.click(screen.getByTestId('audiobook-close'));
    expect(screen.queryByTestId('audiobook-mini-player')).toBeNull();
  });
});
