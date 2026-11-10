/**
 * VTID-05675 — a non-host viewer sees "Join waiting room" only when the room is due
 * (scheduled time has passed) AND the host enabled entry before they start.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomDrawer } from './LiveRoomDrawer';
import type { LiveRoom } from './LiveRoomCard';

vi.mock('@/hooks/useStreamSubscribers', () => ({
  useStreamSubscribers: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/hooks/useStreamSubscription', () => ({
  useMyStreamSubscriptions: () => ({ data: new Set<string>() }),
  useStreamSubscriberCounts: () => ({ data: { r1: 0 } }),
  useSubscribeToStream: () => ({ mutateAsync: vi.fn() }),
  useUnsubscribeFromStream: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useReminders', () => ({ useCreateReminder: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'viewer' } }) }));
vi.mock('@/components/social/FollowButton', () => ({ FollowButton: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));
vi.mock('@/components/sharing/SocialShareButton', () => ({ default: () => null }));

const base: LiveRoom = {
  id: 'r1',
  title: 'Sunday Brunch',
  host: { id: 'host', name: 'Jovana' },
  isLive: false,
  participants: 0,
  interestedCount: 1,
  tags: [],
  type: 'video',
};

const renderWith = (r: LiveRoom) =>
  render(
    <MemoryRouter>
      <LiveRoomDrawer room={r} open onOpenChange={() => {}} onJoin={() => {}} />
    </MemoryRouter>,
  );

const past = new Date(Date.now() - 2 * 60_000).toISOString();
const future = new Date(Date.now() + 3 * 86400_000).toISOString();

describe('LiveRoomDrawer entry before host (VTID-05675)', () => {
  it('shows Join waiting room when due and the host enabled entry', () => {
    renderWith({ ...base, scheduledTime: past, allowEntryBeforeHost: true });
    expect(screen.getByText('Raum beitreten')).toBeTruthy();
  });

  it('hides Join waiting room when the host did not enable entry', () => {
    renderWith({ ...base, scheduledTime: past, allowEntryBeforeHost: false });
    expect(screen.queryByText('Raum beitreten')).toBeNull();
  });

  it('hides Join waiting room before the scheduled time', () => {
    renderWith({ ...base, scheduledTime: future, allowEntryBeforeHost: true });
    expect(screen.queryByText('Raum beitreten')).toBeNull();
  });
});
