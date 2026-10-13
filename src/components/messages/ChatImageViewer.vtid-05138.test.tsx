/**
 * VTID-05138 — the full-screen chat picture viewer and its actions.
 *
 * Pins: opens on the tapped picture; swipe and arrow keys move between the
 * message's pictures; double-click zooms; Esc closes; the toolbar downloads,
 * copies, shares (only where files can be shared) and forwards; copying where
 * the clipboard cannot take pictures shows a translated toast, never nothing.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const h = vi.hoisted(() => ({
  download: vi.fn(),
  copy: vi.fn(),
  share: vi.fn(),
  canShare: vi.fn(() => false),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@/lib/i18n-toast', async () => ({
  ...(await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast')),
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: h.notify,
  notifyError: h.notifyError,
}));
vi.mock('@/lib/chatImageActions', async () => ({
  ...(await vi.importActual<typeof import('@/lib/chatImageActions')>('@/lib/chatImageActions')),
  downloadChatFile: h.download,
  copyImageAndNotify: h.copy,
  shareImageAndNotify: h.share,
  canShareImageFiles: h.canShare,
}));

import { ChatImageViewer } from './ChatImageViewer';

// jsdom has no PointerEvent; the viewer only needs the mouse fields + id/type.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? 'mouse';
      }
    }
    (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
  }
});

const IMAGES = [
  { url: 'https://img.example/1.png', filename: 'eins.png' },
  { url: 'https://img.example/2.jpg', filename: 'zwei.jpg' },
];

function renderViewer(props: Partial<Parameters<typeof ChatImageViewer>[0]> = {}) {
  const onClose = vi.fn();
  const onForward = vi.fn();
  render(<ChatImageViewer open images={IMAGES} initialIndex={0} onClose={onClose} onForward={onForward} {...props} />);
  return { onClose, onForward };
}

const currentSrc = () => screen.getByTestId('chat-image-viewer-image').getAttribute('src');

beforeEach(() => {
  Object.values(h).forEach((f) => f.mockReset());
  h.canShare.mockReturnValue(false);
});

describe('ChatImageViewer (VTID-05138)', () => {
  it('opens on the tapped picture with a counter', () => {
    renderViewer({ initialIndex: 1 });
    expect(screen.getByTestId('chat-image-viewer').getAttribute('role')).toBe('dialog');
    expect(currentSrc()).toBe('https://img.example/2.jpg');
    expect(screen.getByTestId('chat-image-viewer-counter').textContent).toBe('screens.messages.imageCounter:{"current":2,"total":2}');
  });

  it('arrow keys move between the pictures and Esc closes', () => {
    const { onClose } = renderViewer();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(currentSrc()).toBe('https://img.example/2.jpg');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(currentSrc()).toBe('https://img.example/1.png');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a horizontal swipe moves to the next picture', () => {
    renderViewer();
    const stage = screen.getByTestId('chat-image-viewer-stage');
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: 'touch', clientX: 300, clientY: 200 });
    fireEvent.pointerMove(stage, { pointerId: 1, pointerType: 'touch', clientX: 150, clientY: 205 });
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType: 'touch', clientX: 100, clientY: 205 });
    expect(currentSrc()).toBe('https://img.example/2.jpg');
  });

  it('double-click zooms in and back out', () => {
    renderViewer();
    const stage = screen.getByTestId('chat-image-viewer-stage');
    fireEvent.doubleClick(stage);
    expect(screen.getByTestId('chat-image-viewer-image').getAttribute('data-scale')).toBe('2.5');
    fireEvent.doubleClick(stage);
    expect(screen.getByTestId('chat-image-viewer-image').getAttribute('data-scale')).toBe('1');
  });

  it('the toolbar downloads, copies and forwards the current picture', () => {
    const { onForward } = renderViewer();
    fireEvent.click(screen.getByTestId('chat-image-viewer-download'));
    expect(h.download).toHaveBeenCalledWith('https://img.example/1.png', 'eins.png');
    fireEvent.click(screen.getByTestId('chat-image-viewer-copy'));
    expect(h.copy).toHaveBeenCalledWith('https://img.example/1.png');
    fireEvent.click(screen.getByTestId('chat-image-viewer-forward'));
    expect(onForward).toHaveBeenCalledTimes(1);
  });

  it('Share appears only where the device can share files', () => {
    renderViewer();
    expect(screen.queryByTestId('chat-image-viewer-share')).toBeNull();
  });

  it('shares the current picture where supported', () => {
    h.canShare.mockReturnValue(true);
    renderViewer();
    fireEvent.click(screen.getByTestId('chat-image-viewer-share'));
    expect(h.share).toHaveBeenCalledWith('https://img.example/1.png', 'eins.png');
  });

  it('hides Forward when the message cannot be forwarded', () => {
    renderViewer({ onForward: undefined });
    expect(screen.queryByTestId('chat-image-viewer-forward')).toBeNull();
  });
});

describe('copying a picture (VTID-05138)', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete (navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (globalThis as { ClipboardItem?: unknown }).ClipboardItem;
    vi.unstubAllGlobals();
  });

  it('shows a translated toast when the clipboard cannot take pictures', async () => {
    const actual = await vi.importActual<typeof import('@/lib/chatImageActions')>('@/lib/chatImageActions');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn() } });
    const result = await actual.copyImageAndNotify('https://img.example/1.png');
    expect(result).toBe('unsupported');
    expect(h.notifyError).toHaveBeenCalledWith('screens.messages.imageCopyUnsupported');
  });

  it('writes a PNG ClipboardItem when supported', async () => {
    const actual = await vi.importActual<typeof import('@/lib/chatImageActions')>('@/lib/chatImageActions');
    const write = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } });
    class FakeClipboardItem {
      constructor(public items: Record<string, Promise<Blob>>) {}
    }
    (globalThis as { ClipboardItem?: unknown }).ClipboardItem = FakeClipboardItem;
    // jsdom's Response cannot wrap a jsdom Blob; fetchImageBlob only needs ok + blob().
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'image/png' }) })));

    const result = await actual.copyImageAndNotify('https://img.example/1.png');
    expect(result).toBe('copied');
    const item = (write.mock.calls[0] as unknown as [FakeClipboardItem[]])[0][0];
    const blob = await item.items['image/png'];
    expect(blob.type).toBe('image/png');
    expect(h.notify).toHaveBeenCalledWith('screens.messages.imageCopied');
  });
});
