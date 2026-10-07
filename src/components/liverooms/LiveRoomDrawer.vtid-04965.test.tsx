/**
 * VTID-04965 — Live Room drawer: the host opens their profile, share is the
 * real share control, and "Erinnern" tells the member it is in the calendar.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LiveRoomDrawer } from './LiveRoomDrawer';
import type { LiveRoom } from './LiveRoomCard';

vi.mock('@/hooks/useStreamSubscribers', () => ({ useStreamSubscribers: () => ({ data: [], isLoading: false }) }));
vi.mock('@/hooks/useStreamSubscription', () => ({
  useMyStreamSubscriptions: () => ({ data: new Set<string>() }),
  useStreamSubscriberCounts: () => ({ data: {} }),
  useSubscribeToStream: () => ({ mutateAsync: vi.fn() }),
  useUnsubscribeFromStream: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useReminders', () => ({ useCreateReminder: () => ({ mutateAsync: vi.fn() }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/components/social/FollowButton', () => ({ FollowButton: () => null }));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));
vi.mock('@/components/sharing/SocialShareButton', () => ({
  default: (p: { type: string; variant: string; data: { link: string; title: string } }) => (
    <button data-testid="social-share" data-type={p.type} data-variant={p.variant} data-link={p.data.link}>
      {p.data.title}
    </button>
  ),
}));

const room: LiveRoom = {
  id: 'r1',
  title: 'Song release',
  host: { id: 'host-1', name: 'Mariia Maksina' },
  isLive: false,
  scheduledTime: new Date(Date.now() + 3 * 86400_000).toISOString(),
  participants: 0,
  interestedCount: 0,
  tags: [],
  type: 'video',
};

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const renderDrawer = (r: LiveRoom, isCreator = false) =>
  render(
    <MemoryRouter initialEntries={['/events']}>
      <Routes>
        <Route path="*" element={<><Where /><LiveRoomDrawer room={r} open onOpenChange={() => {}} isCreator={isCreator} /></>} />
      </Routes>
    </MemoryRouter>,
  );

describe('LiveRoomDrawer (VTID-04965)', () => {
  it('tapping the host opens their profile', () => {
    renderDrawer(room);
    fireEvent.click(screen.getByTestId('live-room-host-link'));
    expect(screen.getByTestId('where').textContent).toBe('/u/host-1');
  });

  it('the host of the room can open their own profile from the pill too', () => {
    renderDrawer(room, true);
    fireEvent.click(screen.getByTestId('live-room-host-link'));
    expect(screen.getByTestId('where').textContent).toBe('/u/host-1');
  });

  it('share is the shared share control for a live room, with the room link', () => {
    renderDrawer(room);
    const share = screen.getByTestId('social-share');
    expect(share.getAttribute('data-type')).toBe('live_room');
    expect(share.getAttribute('data-variant')).toBe('icon');
    expect(share.getAttribute('data-link')).toContain('r1');
  });

  it('a live room has the same share control', () => {
    renderDrawer({ ...room, isLive: true });
    expect(screen.getByTestId('social-share')).toBeTruthy();
  });
});
