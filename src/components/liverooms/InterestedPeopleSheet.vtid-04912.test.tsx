/**
 * VTID-04912 — tapping the "X going" count on a scheduled Live Room card lists
 * the people who are interested; the tap never opens the card itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomCard, type LiveRoom } from './LiveRoomCard';

let people: Array<{ user_id: string; display_name: string | null; avatar_url: string | null; subscribed_at: string }> = [];
let loading = false;
const hook = vi.fn();

vi.mock('@/hooks/useStreamSubscribers', () => ({
  useStreamSubscribers: (...a: unknown[]) => {
    hook(...a);
    return { data: people, isLoading: loading };
  },
}));
vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));

const room: LiveRoom = {
  id: 'r1',
  title: 'Mariia’s Live Room is back',
  host: { id: 'host', name: 'Mariia' },
  isLive: false,
  scheduledTime: new Date(Date.now() + 3 * 3600_000).toISOString(),
  participants: 0,
  interestedCount: 2,
  tags: [],
  type: 'video',
};

const renderCard = (onClick = vi.fn()) => {
  render(
    <MemoryRouter>
      <LiveRoomCard room={room} onClick={onClick} />
    </MemoryRouter>,
  );
  return onClick;
};

beforeEach(() => {
  people = [];
  loading = false;
  hook.mockClear();
});

describe('interested people list', () => {
  it('does not load anyone until the count is tapped', () => {
    renderCard();
    expect(screen.queryByTestId('interested-people-list')).toBeNull();
    expect(hook).not.toHaveBeenCalled();
  });

  it('tapping the count opens the list with each person, and not the card', () => {
    people = [
      { user_id: 'u1', display_name: 'Ana', avatar_url: null, subscribed_at: '2026-10-06T10:00:00Z' },
      { user_id: 'u2', display_name: null, avatar_url: null, subscribed_at: '2026-10-06T09:00:00Z' },
    ];
    const onClick = renderCard();
    fireEvent.click(screen.getByTestId('live-room-interested'));
    expect(screen.getAllByTestId('interested-person')).toHaveLength(2);
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(hook).toHaveBeenCalledWith('r1', true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows an empty state when nobody can be listed', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('live-room-interested'));
    expect(screen.queryAllByTestId('interested-person')).toHaveLength(0);
    expect(screen.getByTestId('interested-people-list').textContent?.length).toBeGreaterThan(0);
  });

  it('the count is a labelled button', () => {
    renderCard();
    const chip = screen.getByTestId('live-room-interested');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('aria-label')).toBeTruthy();
  });
});
