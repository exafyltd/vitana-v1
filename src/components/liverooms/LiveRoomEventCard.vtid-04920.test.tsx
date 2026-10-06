/**
 * VTID-04920 — Events Live Room card: date·time in ONE pill, the info pills on
 * one non-wrapping row, and the CTA lifted clear of the floating Orb on phones.
 * (Class presence is a guard; the layout itself is checked on the PR preview.)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomEventCard } from './LiveRoomEventCard';
import type { LiveRoom } from './LiveRoomCard';

vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));
vi.mock('@/hooks/useStreamSubscribers', () => ({ useStreamSubscribers: () => ({ data: [], isLoading: false }) }));

const room: LiveRoom = {
  id: 'r1',
  title: 'Mariia’s Live Room is back',
  host: { id: 'host', name: 'Mariia' },
  isLive: false,
  scheduledTime: '2026-10-06T18:00:00Z',
  durationMinutes: 90,
  participants: 0,
  interestedCount: 7,
  tags: [],
  type: 'video',
};

const renderCard = () =>
  render(
    <MemoryRouter>
      <LiveRoomEventCard room={room} />
    </MemoryRouter>,
  );

describe('LiveRoomEventCard layout', () => {
  it('shows date and time together in a single pill, not two', () => {
    renderCard();
    const pill = screen.getByTestId('live-room-date-time');
    expect(pill.textContent).toMatch(/\d{1,2}:\d{2}/);
    expect(pill.textContent).toMatch(/Oct|Okt/);
    // exactly one pill carries the time
    expect(screen.getAllByText(/\d{1,2}:\d{2}/)).toHaveLength(1);
  });

  it('keeps date·time, duration and going on one non-wrapping row', () => {
    renderCard();
    const row = screen.getByTestId('live-room-info-pills');
    expect(row.className).toContain('flex-nowrap');
    expect(row.className).not.toContain('flex-wrap ');
    expect(row.children).toHaveLength(3);
    expect(screen.getByTestId('live-room-interested')).toBeTruthy();
  });

  it('lifts the content (and so the CTA) above the Orb on phones only', () => {
    renderCard();
    const content = screen.getByTestId('live-room-card-content');
    expect(content.className).toContain('pb-16');
    expect(content.className).toContain('md:pb-5');
    expect(screen.getByTestId('live-room-card-notify')).toBeTruthy();
  });
});
