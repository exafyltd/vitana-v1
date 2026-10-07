/**
 * The "Who's going" row in the Live Room drawer shows real people and opens the
 * people list on tap (it used to render placeholder "U1…U5" avatars and do nothing).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomDrawer } from './LiveRoomDrawer';
import type { LiveRoom } from './LiveRoomCard';

const people = [
  { user_id: 'u1', display_name: 'Ana', avatar_url: null, subscribed_at: '2026-10-06T10:00:00Z' },
  { user_id: 'u2', display_name: 'Boris', avatar_url: null, subscribed_at: '2026-10-06T09:00:00Z' },
];

vi.mock('@/hooks/useStreamSubscribers', () => ({
  useStreamSubscribers: () => ({ data: people, isLoading: false }),
}));
vi.mock('@/hooks/useStreamSubscription', () => ({
  useMyStreamSubscriptions: () => ({ data: new Set<string>() }),
  useStreamSubscriberCounts: () => ({ data: { r1: 10 } }),
  useSubscribeToStream: () => ({ mutateAsync: vi.fn() }),
  useUnsubscribeFromStream: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useReminders', () => ({ useCreateReminder: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/components/social/FollowButton', () => ({ FollowButton: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));

const room: LiveRoom = {
  id: 'r1',
  title: 'Maxina release',
  host: { id: 'host', name: 'Mariia' },
  isLive: false,
  scheduledTime: new Date(Date.now() + 3 * 86400_000).toISOString(),
  participants: 0,
  interestedCount: 10,
  tags: [],
  type: 'video',
};

const renderDrawer = (r: LiveRoom) =>
  render(
    <MemoryRouter>
      <LiveRoomDrawer room={r} open onOpenChange={() => {}} />
    </MemoryRouter>,
  );

describe('LiveRoomDrawer people row', () => {
  it('shows real initials, not placeholders, and opens the list on tap', () => {
    renderDrawer(room);
    expect(screen.queryByText('U1')).toBeNull();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.queryByTestId('interested-people-list')).toBeNull();

    fireEvent.click(screen.getByTestId('drawer-interested-trigger'));
    expect(screen.getByTestId('interested-people-list')).toBeTruthy();
    expect(screen.getAllByTestId('interested-person')).toHaveLength(2);
  });

  it('a live room shows only the viewer count, no tappable list', () => {
    renderDrawer({ ...room, isLive: true, participants: 4 });
    expect(screen.queryByTestId('drawer-interested-trigger')).toBeNull();
  });
});
