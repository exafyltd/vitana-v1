/**
 * VTID-04913 — a Live Room in the Events list is the Live Room card: Notify me
 * (or Join when live), Share and the interested count.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { LiveStream } from '@/hooks/useLiveStreams';

const subscribe = vi.fn().mockResolvedValue(undefined);
const unsubscribe = vi.fn().mockResolvedValue(undefined);
let mySubs = new Set<string>();
let counts: Record<string, number> = {};

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useProfiles', () => ({ useProfilesByIds: () => ({ data: [] }) }));
vi.mock('@/hooks/useStreamSubscription', () => ({
  useStreamSubscriberCounts: () => ({ data: counts }),
  useMyStreamSubscriptions: () => ({ data: mySubs }),
  useSubscribeToStream: () => ({ mutateAsync: subscribe }),
  useUnsubscribeFromStream: () => ({ mutateAsync: unsubscribe }),
}));
vi.mock('@/hooks/useReminders', () => ({ useCreateReminder: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/sharing/SocialShareButton', () => ({
  default: () => <button type="button" aria-label="share-stub" />,
}));
vi.mock('@/components/liverooms/LiveRoomDrawer', () => ({ LiveRoomDrawer: () => null }));

import { EventLiveRoomCard, liveStreamToEvent } from './EventsLiveRooms';

const stream = (o: Partial<LiveStream>): LiveStream =>
  ({
    id: 'room-1',
    title: 'Mariia’s Live Room is back',
    description: 'See you',
    tags: [],
    status: 'pending',
    scheduled_for: new Date(Date.now() + 3600_000).toISOString(),
    started_at: null,
    duration_minutes: 90,
    viewer_count: 0,
    created_by: 'host',
    created_at: '2026-10-05T10:00:00Z',
    stream_type: 'video',
    access_level: 'public',
    cover_image_url: null,
    ...o,
  }) as LiveStream;

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function renderCard(s: LiveStream, onOpenDrawer = vi.fn()) {
  const event = liveStreamToEvent(s, { name: 'Mariia' });
  render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="/events" element={<EventLiveRoomCard event={event} onOpenDrawer={onOpenDrawer} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onOpenDrawer };
}

beforeEach(() => {
  subscribe.mockClear();
  unsubscribe.mockClear();
  mySubs = new Set();
  counts = {};
});

describe('EventLiveRoomCard', () => {
  it('a scheduled room shows Notify me and Share, no LIVE badge', () => {
    renderCard(stream({}));
    expect(screen.getByTestId('live-room-card-notify')).toBeTruthy();
    expect(screen.getByTestId('live-room-card-share')).toBeTruthy();
    expect(screen.queryByTestId('live-room-badge')).toBeNull();
  });

  it('Notify me subscribes to the room', async () => {
    renderCard(stream({}));
    fireEvent.click(screen.getByTestId('live-room-card-notify'));
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith('room-1'));
  });

  it('Notify me again unsubscribes when already on', async () => {
    mySubs = new Set(['room-1']);
    renderCard(stream({}));
    fireEvent.click(screen.getByTestId('live-room-card-notify'));
    await waitFor(() => expect(unsubscribe).toHaveBeenCalledWith('room-1'));
  });

  it('a scheduled card tap opens the drawer, not the room', () => {
    const { onOpenDrawer } = renderCard(stream({}));
    fireEvent.click(document.querySelector('[data-room-id="room-1"]') as Element);
    expect(onOpenDrawer).toHaveBeenCalledTimes(1);
  });

  it('a live room shows the LIVE badge and Join, and Join opens the room', () => {
    renderCard(stream({ status: 'live', started_at: new Date().toISOString(), scheduled_for: null }));
    expect(screen.getByTestId('live-room-badge')).toBeTruthy();
    fireEvent.click(screen.getByTestId('live-room-card-join'));
    expect(screen.getByTestId('where').textContent).toBe('/comm/live-rooms/room-1/view');
  });

  it('the wrapper keeps data-event-id for the deep-link scroll', () => {
    renderCard(stream({}));
    const w = document.querySelector('[data-event-id="room-1"][data-live-room="scheduled"]');
    expect(w).toBeTruthy();
  });
});
