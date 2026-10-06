/**
 * VTID-04906 (LR-B) — the Live Room viewer enters through the gateway.
 *
 * Pins: the viewer calls `enter` and hands the meeting token to Daily; a
 * refused `enter` (409 NOT_LIVE) shows its own state; the exit button is
 * rendered in every state (gate, connecting, error, in room); leaving records
 * the exit and never ends the room; only the host's confirmed
 * "End for everyone" calls `/end`; unmount records the exit with keepalive.
 * Everything is mocked — no network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const enterRoom = vi.fn();
const exitRoom = vi.fn();
const endRoomMutate = vi.fn();
let hostUserId = 'someone-else';
let roomState: Record<string, unknown> = {
  room: { status: 'live' },
  session: { session_title: 'Morning flow' },
  counts: { in_room: 3, lobby_waiting: 0 },
};

vi.mock('@/services/liveRoomService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/liveRoomService')>();
  return {
    ...actual,
    liveRoomService: {
      enterRoom: (...a: unknown[]) => enterRoom(...a),
      exitRoom: (...a: unknown[]) => exitRoom(...a),
      hostPresent: vi.fn(() => Promise.resolve()),
      hostAbsent: vi.fn(() => Promise.resolve()),
    },
  };
});

vi.mock('@/components/liverooms/DailyVideoRoom', () => ({
  DailyVideoRoom: (props: { roomUrl: string; token?: string; onLeft?: () => void }) => (
    <div data-testid="daily-stub" data-url={props.roomUrl} data-token={props.token}>
      <button type="button" onClick={props.onLeft}>daily-leave</button>
    </div>
  ),
}));

vi.mock('@/hooks/useMyRoom', () => ({
  useRoomState: () => ({ data: roomState }),
  useEndRoom: () => ({ mutate: endRoomMutate, isPending: false }),
}));
vi.mock('@/hooks/useHostPresence', () => ({ useHostPresence: () => undefined }));
vi.mock('@/hooks/useStreamRecording', () => ({
  useStreamRecording: () => ({ isRecording: false, stopRecording: vi.fn() }),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/context/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'me', email: 'me@example.com' } }),
}));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SubNavigation', () => ({ default: () => null }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/StreamRecordingPlayer', () => ({ StreamRecordingPlayer: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.maybeSingle = () => Promise.resolve({ data: { host_user_id: hostUserId, metadata: {} }, error: null });
  return { supabase: { from: () => builder } };
});

import LiveRoomViewer from './LiveRoomViewer';
import { LiveRoomEnterError } from '@/services/liveRoomService';

const ROOM = '11111111-2222-4333-8444-555555555555';

function renderViewer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/comm/live-rooms/${ROOM}/view`]}>
        <Routes>
          <Route path="/comm/live-rooms/:roomId/view" element={<LiveRoomViewer />} />
          <Route path="/comm/live-rooms" element={<div data-testid="rooms-list" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  enterRoom.mockReset();
  exitRoom.mockReset().mockResolvedValue(undefined);
  endRoomMutate.mockReset();
  hostUserId = 'someone-else';
  roomState = {
    room: { status: 'live' },
    session: { session_title: 'Morning flow' },
    counts: { in_room: 3, lobby_waiting: 0 },
  };
});

describe('LiveRoomViewer — enter through the gateway (VTID-04906)', () => {
  it('shows the exit button before entering, calls enter and passes the token to Daily', async () => {
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/vitana-1', token: 'tok-123', is_host: false, counts: { in_room: 4 } });
    renderViewer();

    expect(screen.getByTestId('live-room-exit')).toBeInTheDocument();
    const enter = await screen.findByTestId('live-room-enter');
    fireEvent.click(enter);

    const daily = await screen.findByTestId('daily-stub');
    expect(enterRoom).toHaveBeenCalledWith(ROOM);
    expect(daily.dataset.url).toBe('https://x.daily.co/vitana-1');
    expect(daily.dataset.token).toBe('tok-123');
    // exit stays available in the room, and the live count is shown
    expect(screen.getByTestId('live-room-exit')).toBeInTheDocument();
    expect(screen.getByTestId('live-room-viewer-count').textContent).toContain('3');
    // a viewer gets no "end for everyone"
    expect(screen.queryByTestId('live-room-end')).not.toBeInTheDocument();
  });

  it('keeps the exit button while connecting', async () => {
    enterRoom.mockReturnValue(new Promise(() => {}));
    renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    expect(await screen.findByTestId('live-room-entering')).toBeInTheDocument();
    expect(screen.getByTestId('live-room-exit')).toBeInTheDocument();
  });

  it('shows the not-live state (409) with the exit button, never a Daily frame', async () => {
    enterRoom.mockRejectedValue(new LiveRoomEnterError('NOT_LIVE', 409, 'NOT_LIVE'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));

    const err = await screen.findByTestId('live-room-error');
    expect(err.textContent).toMatch(/nicht live/i);
    expect(screen.getByTestId('live-room-exit')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-stub')).not.toBeInTheDocument();
  });

  it('a viewer leaving records the exit and never ends the room', async () => {
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/r', token: 't', is_host: false });
    renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    await screen.findByTestId('daily-stub');

    fireEvent.click(screen.getByTestId('live-room-exit'));
    expect(await screen.findByTestId('rooms-list')).toBeInTheDocument();
    expect(exitRoom).toHaveBeenCalledTimes(1);
    expect(exitRoom.mock.calls[0][0]).toBe(ROOM);
    expect(endRoomMutate).not.toHaveBeenCalled();
  });

  it("Daily's own Leave button also only leaves", async () => {
    hostUserId = 'me';
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/r', token: 'owner', is_host: true });
    renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    await screen.findByTestId('daily-stub');

    fireEvent.click(screen.getByText('daily-leave'));
    expect(await screen.findByTestId('rooms-list')).toBeInTheDocument();
    expect(exitRoom).toHaveBeenCalledTimes(1);
    expect(endRoomMutate).not.toHaveBeenCalled();
  });

  it('the host ends the room for everyone only after confirming', async () => {
    hostUserId = 'me';
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/r', token: 'owner', is_host: true });
    renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    await screen.findByTestId('daily-stub');

    fireEvent.click(screen.getByTestId('live-room-end'));
    expect(endRoomMutate).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('live-room-end-confirm'));
    await waitFor(() => expect(endRoomMutate).toHaveBeenCalledTimes(1));
    expect(endRoomMutate.mock.calls[0][0]).toBe(ROOM);
  });

  it('records the exit with keepalive when the page unmounts', async () => {
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/r', token: 't', is_host: false });
    const { unmount } = renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    await screen.findByTestId('daily-stub');
    act(() => unmount());
    expect(exitRoom).toHaveBeenCalledTimes(1);
    expect(exitRoom).toHaveBeenCalledWith(ROOM, { keepalive: true });
  });

  it('records the exit on pagehide, once', async () => {
    enterRoom.mockResolvedValue({ ok: true, daily_room_url: 'https://x.daily.co/r', token: 't', is_host: false });
    const { unmount } = renderViewer();
    fireEvent.click(await screen.findByTestId('live-room-enter'));
    await screen.findByTestId('daily-stub');
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    act(() => unmount());
    expect(exitRoom).toHaveBeenCalledTimes(1);
  });
});

describe('LiveRoomViewer — no browser-side lifecycle writes (VTID-04906)', () => {
  it('never writes live_rooms / live_room_sessions / community_live_streams and never calls /daily', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const src = readFileSync(join(__dirname, 'LiveRoomViewer.tsx'), 'utf8');
    expect(src).not.toMatch(/\.from\('live_room_sessions'\)/);
    expect(src).not.toMatch(/\.from\('community_live_streams'\)/);
    expect(src).not.toMatch(/\.update\(/);
    expect(src).not.toContain('createDailyRoom');
  });
});
