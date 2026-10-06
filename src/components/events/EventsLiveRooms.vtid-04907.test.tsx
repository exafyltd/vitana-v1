/**
 * VTID-04907 — Live Rooms are listed in the Events catalog as normal event
 * items (event_type 'live_room') with a red LIVE badge; a live card opens the
 * room, a scheduled card opens the Live Room drawer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, fireEvent } from '@testing-library/react';
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
vi.mock('@/hooks/useProfiles', () => ({
  useProfilesByIds: () => ({ data: [{ user_id: 'h1', display_name: 'Mariia', avatar_url: 'https://x/a.jpg' }] }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/components/liverooms/LiveRoomDrawer', () => ({
  LiveRoomDrawer: (p: { room: { title: string; isLive: boolean }; open: boolean }) =>
    p.open ? <div data-testid="live-room-drawer">{p.room.title}</div> : null,
}));

import {
  liveStreamToEvent,
  useLiveRoomEvents,
  liveRoomCardOverrides,
  isLiveRoomEvent,
  isOngoingLiveRoom,
  LiveRoomEventDrawer,
  useOpenLiveRoom,
} from './EventsLiveRooms';

const mk = (o: Partial<LiveStream>): LiveStream =>
  ({
    id: 'x',
    title: 't',
    description: null,
    tags: [],
    status: 'pending',
    scheduled_for: null,
    started_at: null,
    duration_minutes: 90,
    viewer_count: 0,
    created_by: 'h1',
    created_at: '2026-10-05T10:00:00Z',
    stream_type: 'video',
    access_level: 'public',
    cover_image_url: null,
    ...o,
  }) as LiveStream;

describe('liveStreamToEvent', () => {
  it("maps Mariia's scheduled room to an event item (start, end, cover, host)", () => {
    const e = liveStreamToEvent(
      mk({ id: 'r1', title: "Mariia's Live Room", scheduled_for: '2026-10-06T18:00:00Z' }),
      { name: 'Mariia', avatar: 'https://x/a.jpg' },
      new Date('2026-10-06T09:00:00Z').getTime(),
    );
    expect(e).toMatchObject({
      id: 'r1',
      title: "Mariia's Live Room",
      event_type: 'live_room',
      start_time: '2026-10-06T18:00:00Z',
      end_time: '2026-10-06T19:30:00.000Z',
      image_url: 'https://x/a.jpg',
      creator_display_name: 'Mariia',
      participant_count: 0,
    });
    expect(isLiveRoomEvent(e)).toBe(true);
    expect(isOngoingLiveRoom(e)).toBe(false);
  });

  it('a live room starts at started_at, counts viewers and is ongoing', () => {
    const e = liveStreamToEvent(
      mk({ status: 'live', started_at: '2026-10-06T17:55:00Z', scheduled_for: '2026-10-06T18:00:00Z', viewer_count: 7, cover_image_url: 'https://x/c.jpg' }),
      { name: 'Mariia' },
    );
    expect(e.start_time).toBe('2026-10-06T17:55:00Z');
    expect(e.participant_count).toBe(7);
    expect(e.image_url).toBe('https://x/c.jpg');
    expect(isOngoingLiveRoom(e)).toBe(true);
  });

  it('a pending room whose start has passed is ongoing (due)', () => {
    const e = liveStreamToEvent(mk({ scheduled_for: '2026-10-06T08:00:00Z' }), { name: 'M' }, new Date('2026-10-06T09:00:00Z').getTime());
    expect(e.metadata.is_due).toBe(true);
    expect(isOngoingLiveRoom(e)).toBe(true);
  });
});

describe('useLiveRoomEvents', () => {
  beforeEach(() => {
    live = [];
    scheduled = [];
  });

  it('lists live and scheduled rooms once each, with the host profile', () => {
    live = [mk({ id: 'a', status: 'live', started_at: '2026-10-06T07:00:00Z' })];
    scheduled = [mk({ id: 'b', scheduled_for: '2027-01-01T18:00:00Z' }), mk({ id: 'a', scheduled_for: '2026-10-06T07:00:00Z' })];
    const { result } = renderHook(() => useLiveRoomEvents());
    expect(result.current.map((e) => e.id).sort()).toEqual(['a', 'b']);
    expect(result.current.find((e) => e.id === 'a')!.metadata.is_live).toBe(true);
    expect(result.current[0].creator_display_name).toBe('Mariia');
  });
});

describe('liveRoomCardOverrides', () => {
  it('red LIVE badge and no RSVP / price / edit menu / share for a room card', () => {
    const scheduledRoom = liveStreamToEvent(mk({ scheduled_for: '2027-01-01T18:00:00Z', viewer_count: 3 }), { name: 'M' });
    const o = liveRoomCardOverrides(scheduledRoom);
    expect(o.pillar).toBe('LIVE');
    expect(o.pillarVariant).toBe('live');
    expect(o.showSmartAction).toBe(false);
    expect(o.eventId).toBeUndefined();
    expect(o.price).toBeUndefined();
    expect(o.utilityTopRight).toBeUndefined();
    expect(o.actionButton).toBeUndefined();
    const liveRoom = liveStreamToEvent(mk({ status: 'live', started_at: '2026-10-06T07:00:00Z' }), { name: 'M' });
    expect(liveRoomCardOverrides(liveRoom).pillarVariant).toBe('live-now');
  });
});

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function Opener({ e }: { e: ReturnType<typeof liveStreamToEvent> }) {
  const open = useOpenLiveRoom();
  return <button onClick={() => open(e)}>go</button>;
}

describe('where a room card leads', () => {
  it('live → the room page', () => {
    const e = liveStreamToEvent(mk({ id: 'room-1', status: 'live', started_at: '2026-10-06T07:00:00Z' }), { name: 'M' });
    render(
      <MemoryRouter initialEntries={['/comm/events-meetups']}>
        <Routes>
          <Route path="/comm/events-meetups" element={<Opener e={e} />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(screen.getByTestId('where').textContent).toBe('/comm/live-rooms/room-1/view');
  });

  it('scheduled → the Live Room drawer', () => {
    const e = liveStreamToEvent(mk({ id: 'room-2', title: 'Sunday Q&A', scheduled_for: '2027-01-01T18:00:00Z' }), { name: 'M' });
    render(
      <MemoryRouter>
        <LiveRoomEventDrawer event={e} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('live-room-drawer').textContent).toBe('Sunday Q&A');
  });
});
