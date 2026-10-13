/**
 * VTID-05138 — a picture sent in a chat shows as a picture.
 *
 * Pins: a stored path renders a fixed-size skeleton until its fresh signed URL
 * is there (never the stale upload-time URL first); a picture that fails to
 * load is re-signed once before it falls back to the file chip; signing that
 * fails falls back to the stored URL; legacy `content_data.files` pictures
 * render inline; a forwarded message carries the "Forwarded" label; the
 * long-press Copy copies the picture of a picture-only message; Forward opens
 * the forward sheet and is hidden for voice messages.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  sign: vi.fn(),
  copyImageAndNotify: vi.fn(),
  forwardPayloads: [] as unknown[],
}));

vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: vi.fn(), from: () => ({}) } };
});
vi.mock('@/lib/i18n-toast', async () => ({
  ...(await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast')),
  t: (key: string) => key,
}));
vi.mock('@/lib/fileUpload', async () => ({
  ...(await vi.importActual<typeof import('@/lib/fileUpload')>('@/lib/fileUpload')),
  getSignedAttachmentUrl: h.sign,
}));
vi.mock('@/lib/chatImageActions', async () => ({
  ...(await vi.importActual<typeof import('@/lib/chatImageActions')>('@/lib/chatImageActions')),
  copyImageAndNotify: h.copyImageAndNotify,
}));
vi.mock('./ForwardMessageSheet', () => ({
  ForwardMessageSheet: ({ open, payload }: { open: boolean; payload: unknown }) => {
    if (open) h.forwardPayloads.push(payload);
    return open ? <div data-testid="forward-sheet-stub" /> : null;
  },
}));

import MessageBubble from './MessageBubble';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function msg(over: Record<string, unknown> = {}) {
  return {
    id: 'm1',
    sender_id: 'other',
    body: '',
    content: '',
    message_type: 'attachment',
    created_at: '2026-10-12T10:00:00Z',
    thread_id: 'other',
    sender: { user_id: 'other', display_name: 'Dragan' },
    content_data: {
      attachments: [
        { type: 'file', path: 'other/me/1_a.png', url: 'https://stale.example/a.png', filename: 'Screenshot_20261012.png', mime: '', size: 314650 },
      ],
    },
    ...over,
  };
}

function renderBubble(message: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <MessageBubble message={message as never} isOwnMessage={false} />
    </MemoryRouter>,
  );
}

function openDrawer() {
  vi.useFakeTimers();
  const bubble = document.querySelector('[tabindex="0"]') as HTMLElement;
  fireEvent.touchStart(bubble, { touches: [{ clientX: 10, clientY: 10 }] });
  act(() => {
    vi.advanceTimersByTime(600);
  });
  fireEvent.touchEnd(bubble);
  vi.useRealTimers();
}

beforeEach(() => {
  h.sign.mockReset();
  h.copyImageAndNotify.mockReset();
  h.forwardPayloads.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('MessageBubble picture attachments (VTID-05138)', () => {
  it('shows a skeleton until the fresh signed URL arrives, never the stale stored URL', async () => {
    const d = deferred<string | null>();
    h.sign.mockReturnValue(d.promise);
    renderBubble(msg());

    expect(screen.getByTestId('chat-image-skeleton')).toBeTruthy();
    expect(document.querySelector('img[src="https://stale.example/a.png"]')).toBeNull();
    expect(screen.queryByTestId('chat-file-chip')).toBeNull();

    await act(async () => d.resolve('https://fresh.example/a.png?token=1'));
    const img = await screen.findByRole('img', { name: 'Screenshot_20261012.png' });
    expect(img.getAttribute('src')).toBe('https://fresh.example/a.png?token=1');
    expect(screen.queryByTestId('chat-image-skeleton')).toBeNull();
  });

  it('re-signs once when the picture fails, renders the new picture, and only then falls back to the chip', async () => {
    h.sign.mockResolvedValueOnce('https://fresh.example/a.png?token=1').mockResolvedValueOnce('https://fresh.example/a.png?token=2');
    renderBubble(msg());

    const first = await screen.findByRole('img', { name: 'Screenshot_20261012.png' });
    fireEvent.error(first);

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Screenshot_20261012.png' }).getAttribute('src')).toBe('https://fresh.example/a.png?token=2'),
    );
    expect(screen.queryByTestId('chat-file-chip')).toBeNull();
    expect(h.sign).toHaveBeenCalledTimes(2);

    // A second failure does not re-sign again: the file chip takes over.
    fireEvent.error(screen.getByRole('img', { name: 'Screenshot_20261012.png' }));
    expect(await screen.findByTestId('chat-file-chip')).toBeTruthy();
    expect(h.sign).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stored URL when signing fails', async () => {
    h.sign.mockResolvedValue(null);
    renderBubble(msg());
    const img = await screen.findByRole('img', { name: 'Screenshot_20261012.png' });
    expect(img.getAttribute('src')).toBe('https://stale.example/a.png');
  });

  it('renders legacy content_data.files pictures inline', async () => {
    renderBubble(
      msg({
        content_data: { files: [{ name: 'photo.jpg', type: 'image/jpeg', size: 1200, url: 'https://cdn.example/photo.jpg' }] },
      }),
    );
    const img = await screen.findByRole('img', { name: 'photo.jpg' });
    expect(img.getAttribute('src')).toBe('https://cdn.example/photo.jpg');
    expect(h.sign).not.toHaveBeenCalled();
  });

  it('opens the full-screen viewer on tap', async () => {
    h.sign.mockResolvedValue('https://fresh.example/a.png?token=1');
    renderBubble(msg());
    fireEvent.click(await screen.findByTestId('chat-image-attachment'));
    const viewer = await screen.findByTestId('chat-image-viewer');
    expect(viewer.querySelector('img')?.getAttribute('src')).toBe('https://fresh.example/a.png?token=1');
  });

  it('labels a forwarded message', async () => {
    renderBubble(msg({ message_type: 'text', body: 'Schau mal', content: 'Schau mal', content_data: { forwarded: true } }));
    expect(screen.getByTestId('message-forwarded-label').textContent).toContain('screens.messages.forwardedLabel');
  });

  it('long-press Copy copies the picture of a picture-only message', async () => {
    h.sign.mockResolvedValue('https://fresh.example/a.png?token=1');
    renderBubble(msg());
    await screen.findByRole('img', { name: 'Screenshot_20261012.png' });
    openDrawer();
    fireEvent.click(await screen.findByTestId('message-action-copy'));
    expect(h.copyImageAndNotify).toHaveBeenCalledWith('https://fresh.example/a.png?token=1');
  });

  it('long-press Forward opens the forward sheet with the attachments', async () => {
    h.sign.mockResolvedValue('https://fresh.example/a.png?token=1');
    renderBubble(msg());
    await screen.findByRole('img', { name: 'Screenshot_20261012.png' });
    openDrawer();
    fireEvent.click(await screen.findByTestId('message-action-forward'));
    expect(await screen.findByTestId('forward-sheet-stub')).toBeTruthy();
    const payload = h.forwardPayloads[h.forwardPayloads.length - 1] as { body: string; attachments: Array<{ path: string }> };
    expect(payload.body).toBe('');
    expect(payload.attachments[0].path).toBe('other/me/1_a.png');
  });

  it('hides Forward for a voice message', async () => {
    h.sign.mockResolvedValue('https://fresh.example/v.webm');
    renderBubble(
      msg({
        message_type: 'voice',
        content_data: { attachments: [{ type: 'voice', path: 'other/me/v.webm', url: 'https://stale.example/v.webm', mime: 'audio/webm', duration: 4 }] },
      }),
    );
    openDrawer();
    expect(await screen.findByTestId('message-action-copy')).toBeTruthy();
    expect(screen.queryByTestId('message-action-forward')).toBeNull();
  });
});
