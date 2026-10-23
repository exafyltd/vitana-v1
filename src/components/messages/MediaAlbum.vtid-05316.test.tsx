/**
 * VTID-05316 (messenger-ux-v2/ui-media-album, R10) — pictures and videos of
 * one message as an album: 2 / 3 / 4 / 7 item layouts, "+N" on the last tile,
 * a tap opens the viewer at that item (videos play there with controls), a
 * single picture keeps today's rendering, and a reaction moves its emoji to
 * the front of the member's recent list.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ sign: vi.fn(), addReaction: vi.fn(), record: vi.fn() }));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [{ emoji: '🔥', count: 1, userReacted: false, users: [] }], addReaction: h.addReaction, removeReaction: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});
vi.mock('@/lib/i18n-toast', async () => ({
  ...(await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast')),
  t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
}));
vi.mock('@/lib/fileUpload', async () => ({
  ...(await vi.importActual<typeof import('@/lib/fileUpload')>('@/lib/fileUpload')),
  getSignedAttachmentUrl: h.sign,
}));
vi.mock('@/components/ui/emoji-picker', async () => ({
  ...(await vi.importActual<typeof import('@/components/ui/emoji-picker')>('@/components/ui/emoji-picker')),
  recordRecentEmoji: (...a: unknown[]) => h.record(...a),
}));

import MessageBubble from './MessageBubble';
import MediaAlbum, { albumLayout } from './MediaAlbum';

const pic = (i: number) => ({ type: 'image', path: `other/me/${i}.jpg`, url: `https://stale/${i}.jpg`, filename: `p${i}.jpg`, mime: 'image/jpeg', size: 10 });
const vid = (i: number) => ({ type: 'video', path: `other/me/${i}.mp4`, url: `https://stale/${i}.mp4`, filename: `v${i}.mp4`, mime: 'video/mp4', size: 10 });

function renderBubble(attachments: unknown[]) {
  return render(
    <MemoryRouter>
      <MessageBubble
        message={{ id: 'm1', sender_id: 'other', body: '', content: '', message_type: 'attachment', created_at: '2026-10-22T10:00:00Z', thread_id: 'other', sender: { user_id: 'other', display_name: 'Ana' }, content_data: { attachments } } as never}
        isOwnMessage={false}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.sign.mockReset().mockImplementation(async (path: string) => `https://fresh/${path}`);
  h.addReaction.mockReset();
  h.record.mockReset();
});

describe('albumLayout', () => {
  it.each([
    [1, { shown: 1, more: 0, variant: 'none' }],
    [2, { shown: 2, more: 0, variant: 'two' }],
    [3, { shown: 3, more: 0, variant: 'three' }],
    [4, { shown: 4, more: 0, variant: 'grid' }],
    [7, { shown: 4, more: 4, variant: 'grid' }],
    [10, { shown: 4, more: 7, variant: 'grid' }],
  ])('%i items → %o', (n, layout) => {
    expect(albumLayout(n)).toEqual(layout);
  });
});

describe('MediaAlbum', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, kind: 'image' as const, url: `https://x/${i}`, alt: `p${i}` }));

  it('2: side by side; 3: one wide on top; 4: 2×2 without "+N"', () => {
    const { rerender } = render(<MediaAlbum items={items(2)} onOpen={vi.fn()} />);
    expect(screen.getAllByTestId('media-album-tile')).toHaveLength(2);
    expect(screen.getByTestId('media-album').dataset.variant).toBe('two');
    rerender(<MediaAlbum items={items(3)} onOpen={vi.fn()} />);
    const tiles = screen.getAllByTestId('media-album-tile');
    expect(tiles).toHaveLength(3);
    expect(tiles[0].className).toContain('col-span-2');
    expect(tiles[1].className).not.toContain('col-span-2');
    rerender(<MediaAlbum items={items(4)} onOpen={vi.fn()} />);
    expect(screen.getAllByTestId('media-album-tile')).toHaveLength(4);
    expect(screen.queryByTestId('media-album-more')).toBeNull();
  });

  it('7: four tiles, the last one "+4"; it opens the 4th item and is labelled', () => {
    const onOpen = vi.fn();
    render(<MediaAlbum items={items(7)} onOpen={onOpen} />);
    const tiles = screen.getAllByTestId('media-album-tile');
    expect(tiles).toHaveLength(4);
    expect(screen.getByTestId('media-album-more').textContent).toBe('+4');
    expect(tiles[3].getAttribute('aria-label')).toBe('inbox.media.moreItems:{"count":4}');
    fireEvent.click(tiles[3]);
    expect(onOpen).toHaveBeenCalledWith(3);
  });

  it('a tile still signing shows a skeleton', () => {
    render(<MediaAlbum items={[{ key: 'a', kind: 'image', url: undefined, alt: 'a' }, ...items(1)]} onOpen={vi.fn()} />);
    expect(screen.getByTestId('media-album-skeleton')).toBeTruthy();
  });
});

describe('MessageBubble albums (VTID-05316)', () => {
  it('3 pictures render one album (no stacked pictures); a tile opens the viewer at that picture', async () => {
    renderBubble([pic(1), pic(2), pic(3)]);
    await waitFor(() => expect(screen.getAllByTestId('media-album-tile')[2].querySelector('img')).toBeTruthy());
    expect(screen.queryByTestId('chat-image-attachment')).toBeNull();
    fireEvent.click(screen.getAllByTestId('media-album-tile')[1]);
    const viewer = await screen.findByTestId('chat-image-viewer-image');
    expect(viewer.getAttribute('src')).toBe('https://fresh/other/me/2.jpg');
    expect(screen.getByTestId('chat-image-viewer-counter').textContent).toBe('screens.messages.imageCounter:{"current":2,"total":3}');
  });

  it('a video in an album plays in the viewer with native controls (no copy button)', async () => {
    renderBubble([pic(1), vid(2)]);
    await waitFor(() => expect(screen.getAllByTestId('media-album-tile')).toHaveLength(2));
    expect(screen.getAllByTestId('media-album-tile')[1].dataset.kind).toBe('video');
    fireEvent.click(screen.getAllByTestId('media-album-tile')[1]);
    const video = await screen.findByTestId('chat-image-viewer-video');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.getAttribute('src')).toBe('https://fresh/other/me/2.mp4');
    expect(screen.queryByTestId('chat-image-viewer-copy')).toBeNull();
  });

  it('a single video shows a play tile (not a file chip); a single picture renders as before', async () => {
    const { unmount } = renderBubble([vid(5)]);
    expect(await screen.findByTestId('chat-video-attachment')).toBeTruthy();
    expect(screen.queryByTestId('chat-file-chip')).toBeNull();
    unmount();
    renderBubble([pic(6)]);
    expect(await screen.findByTestId('chat-image-attachment')).toBeTruthy();
    expect(screen.queryByTestId('media-album')).toBeNull();
  });

  it('files next to pictures stay chips below the album', async () => {
    renderBubble([pic(1), pic(2), { type: 'file', path: 'other/me/r.pdf', url: 'u', filename: 'report.pdf', mime: 'application/pdf', size: 10 }]);
    await waitFor(() => expect(screen.getAllByTestId('media-album-tile')).toHaveLength(2));
    expect(screen.getByTestId('chat-file-chip').textContent).toContain('report.pdf');
  });

  it('reacting with a chip records the emoji in the member\'s recent list', async () => {
    renderBubble([pic(1), pic(2)]);
    const chip = await screen.findByText('🔥');
    await act(async () => { fireEvent.click(chip); });
    expect(h.addReaction).toHaveBeenCalledWith('🔥');
    expect(h.record).toHaveBeenCalledWith('🔥', 'me');
  });
});
