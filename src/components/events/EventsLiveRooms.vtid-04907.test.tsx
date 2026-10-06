/**
 * VTID-04907 (LR-C) — live rooms in the Events catalog: which rooms each tab
 * shows, and where a card leads (live → the room; scheduled → its drawer).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { LiveStream } from '@/hooks/useLiveStreams';

let live: Partial<LiveStream>[] = [];
let scheduled: Partial<LiveStream>[] = [];
vi.mock('@/hooks/useLiveStreams', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useLiveStreams')>();
  return {
    ...actual,
    useLiveStreams: () => ({ data: live }),
    useScheduledStreams: () => ({ data: scheduled }),
  };
});
vi.mock('@/hooks/useProfiles', () => ({ useProfilesByIds: () => ({ data: [{ user_id: 'h1', display_name: 'Ana', avatar_url: null }] }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/components/liverooms/LiveRoomDrawer', () => ({
  LiveRoomDrawer: (p: { room: { title: string }; open: boolean }) =>
    p.open ? <div data-testid="live-room-drawer">{p.room.title}</div> : null,
}));

import { EventsLiveRooms, selectLiveRoomsForTab } from './EventsLiveRooms';

const NOW = new Date('2026-10-05T12:00:00');
const mk = (o: Partial<LiveStream>): LiveStream =>
  ({ id: 'x', title: 't', description: null, tags: [], status: 'pending', scheduled_for: null, viewer_count: 0, created_by: 'h1', stream_type: 'video', access_level: 'public', ...o }) as LiveStream;

describe('selectLiveRoomsForTab', () => {
  const L = [mk({ id: 'l1', status: 'live', viewer_count: 2 }), mk({ id: 'l2', status: 'live', viewer_count: 9 })];
  const S = [
    mk({ id: 'tomorrow', scheduled_for: new Date('2026-10-06T09:00:00').toISOString() }),
    mk({ id: 'today-late', scheduled_for: new Date('2026-10-05T18:00:00').toISOString() }),
    mk({ id: 'today-due', scheduled_for: new Date('2026-10-05T11:30:00').toISOString() }),
    mk({ id: 'next-week', scheduled_for: new Date('2026-10-12T09:00:00').toISOString(), title: 'Yoga' }),
  ];

  it('Hot: live rooms, most viewers first', () => {
    expect(selectLiveRoomsForTab('hot', L, S, '', NOW).map((s) => s.id)).toEqual(['l2', 'l1']);
  });
  it("Today: live first, then today's scheduled by start time (incl. starting soon)", () => {
    expect(selectLiveRoomsForTab('today', L, S, '', NOW).map((s) => s.id)).toEqual(['l2', 'l1', 'today-due', 'today-late']);
  });
  it('Upcoming: scheduled from tomorrow on, by start time', () => {
    expect(selectLiveRoomsForTab('upcoming', L, S, '', NOW).map((s) => s.id)).toEqual(['tomorrow', 'next-week']);
  });
  it('applies the page search', () => {
    expect(selectLiveRoomsForTab('upcoming', L, S, 'yoga', NOW).map((s) => s.id)).toEqual(['next-week']);
  });
});

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function renderAt(tab: 'hot' | 'today' | 'upcoming') {
  return render(
    <MemoryRouter initialEntries={['/comm/events-meetups']}>
      <Routes>
        <Route path="/comm/events-meetups" element={<EventsLiveRooms tab={tab} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventsLiveRooms', () => {
  beforeEach(() => {
    live = [];
    scheduled = [];
  });

  it('renders nothing when the tab has no rooms', () => {
    renderAt('hot');
    expect(screen.queryByTestId('events-live-rooms')).not.toBeInTheDocument();
  });

  it('a live card shows its viewer count and opens the room', () => {
    live = [mk({ id: 'room-1', status: 'live', viewer_count: 5, title: 'Breathwork' })];
    renderAt('hot');
    expect(screen.getByTestId('events-live-room-viewers').textContent).toContain('5');
    fireEvent.click(screen.getByTestId('events-live-room-card'));
    expect(screen.getByTestId('where').textContent).toBe('/comm/live-rooms/room-1/view');
  });

  it('a scheduled card opens the Live Room drawer', () => {
    scheduled = [mk({ id: 'room-2', title: 'Sunday Q&A', scheduled_for: new Date(Date.now() + 3 * 86400000).toISOString() })];
    renderAt('upcoming');
    fireEvent.click(screen.getByTestId('events-live-room-card'));
    expect(screen.getByTestId('live-room-drawer').textContent).toBe('Sunday Q&A');
  });
});
