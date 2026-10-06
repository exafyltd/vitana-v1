/**
 * VTID-04906 (LR-B) — cards: a live room always shows its viewer count (even
 * 0); a due scheduled room shows "starting soon" and its host gets a Start
 * button (enter starts the session), other members do not.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomCard, type LiveRoom } from './LiveRoomCard';

vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));

const base: LiveRoom = {
  id: 'r1',
  title: 'Morning flow',
  host: { id: 'host', name: 'Ana' },
  isLive: false,
  participants: 0,
  tags: [],
  type: 'video',
};

const renderCard = (room: LiveRoom, props: Partial<Parameters<typeof LiveRoomCard>[0]> = {}) =>
  render(<MemoryRouter><LiveRoomCard room={room} {...props} /></MemoryRouter>);

describe('LiveRoomCard', () => {
  it('shows the live viewer count, also when it is 0', () => {
    renderCard({ ...base, isLive: true, participants: 0 });
    expect(screen.getByTestId('live-room-card-viewers').textContent).toContain('0');
  });

  it('lets the host start a due scheduled room', () => {
    const onJoinClick = vi.fn();
    renderCard(
      { ...base, scheduledTime: new Date(Date.now() - 10 * 60_000).toISOString(), startingSoon: true },
      { isCreator: true, onJoinClick },
    );
    fireEvent.click(screen.getByTestId('live-room-card-start'));
    expect(onJoinClick).toHaveBeenCalledTimes(1);
  });

  it('gives other members no Start button on a due room', () => {
    renderCard(
      { ...base, scheduledTime: new Date(Date.now() - 10 * 60_000).toISOString(), startingSoon: true },
      { isCreator: false },
    );
    expect(screen.queryByTestId('live-room-card-start')).not.toBeInTheDocument();
  });
});
