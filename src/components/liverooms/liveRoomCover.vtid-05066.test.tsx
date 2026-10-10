/**
 * VTID-05066 — live-room covers are served through the storage resize CDN
 * (the original multi-MB phone photo kept Events "not ready" for > 10 s on a
 * mid-range phone), with a one-shot fallback to the original.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LiveRoomEventCard } from './LiveRoomEventCard';
import { LiveRoomCard, type LiveRoom } from './LiveRoomCard';

vi.mock('@/components/ui/clickable-avatar', () => ({ ClickableAvatar: () => null }));
vi.mock('@/hooks/useStreamSubscribers', () => ({ useStreamSubscribers: () => ({ data: [], isLoading: false }) }));

const ORIGINAL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/object/public/covers/u1/live-1.jpg';
const RESIZED = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co/storage/v1/render/image/public/covers/u1/live-1.jpg?width=1200&quality=75&resize=contain';

const room = (imageUrl?: string): LiveRoom => ({
  id: 'r1',
  title: 'Live Room',
  host: { id: 'host', name: 'Mariia' },
  isLive: false,
  scheduledTime: '2026-10-30T18:15:00Z',
  durationMinutes: 60,
  participants: 0,
  interestedCount: 0,
  tags: [],
  type: 'video',
  imageUrl,
});

afterEach(cleanup);

const cases = [
  ['LiveRoomEventCard', (r: LiveRoom) => <LiveRoomEventCard room={r} />],
  ['LiveRoomCard', (r: LiveRoom) => <LiveRoomCard room={r} />],
] as const;

describe.each(cases)('%s cover', (_name, el) => {
  const coverImg = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('img')).find((i) => (i.getAttribute('src') ?? '').includes('/covers/')) as HTMLImageElement;

  it('loads the resized cover, never the original first', () => {
    const { container } = render(<MemoryRouter>{el(room(ORIGINAL))}</MemoryRouter>);
    expect(coverImg(container).getAttribute('src')).toBe(RESIZED);
  });

  it('falls back once to the original when the resize is rejected, then gives up', () => {
    const { container } = render(<MemoryRouter>{el(room(ORIGINAL))}</MemoryRouter>);
    fireEvent.error(coverImg(container));
    expect(coverImg(container).getAttribute('src')).toBe(ORIGINAL);
    fireEvent.error(coverImg(container));
    expect(coverImg(container)).toBeUndefined();
  });

  it('leaves a non-Supabase cover untouched', () => {
    const ext = 'https://images.example.com/covers/x.jpg';
    const { container } = render(<MemoryRouter>{el(room(ext))}</MemoryRouter>);
    expect(coverImg(container).getAttribute('src')).toBe(ext);
  });
});
