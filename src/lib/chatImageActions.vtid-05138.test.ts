/**
 * VTID-05138 — which chat messages can be forwarded.
 * Text and attachment messages yes; voice (new or legacy format) and cards
 * whose actions a forwarded copy would silently drop, no.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

const h = vi.hoisted(() => ({ notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/lib/i18n-toast', () => ({ notify: h.notify, notifyError: h.notifyError }));

import {
  canForwardMessage,
  isImageAttachment,
  isVoiceMessage,
  shareMessageOutside,
  shareMessageOutsideAndNotify,
  type ShareOutsideInput,
} from './chatImageActions';

describe('canForwardMessage (VTID-05138)', () => {
  it('forwards text and picture messages', () => {
    expect(canForwardMessage({ message_type: 'text', body: 'hi' })).toBe(true);
    expect(
      canForwardMessage({ message_type: 'attachment', body: '', content_data: { attachments: [{ type: 'image', path: 'a/b/c.png' }] } }),
    ).toBe(true);
  });

  it('never forwards voice, templates or other cards', () => {
    for (const message_type of ['voice', 'template', 'calendar_invite', 'service_booking', 'payment_request', 'system']) {
      expect(canForwardMessage({ message_type, body: 'x' })).toBe(false);
    }
  });

  it('treats a legacy content_data.files audio entry as voice', () => {
    const legacyAudio = { message_type: 'text', body: 'listen', content_data: { files: [{ type: 'audio/webm', name: 'note.webm' }] } };
    expect(isVoiceMessage(legacyAudio)).toBe(true);
    expect(canForwardMessage(legacyAudio)).toBe(false);
  });

  it('a screenshot with an empty mime is still a picture', () => {
    expect(isImageAttachment({ type: 'file', mime: '', filename: 'Screenshot_20261012_210400.png' })).toBe(true);
  });
});

/**
 * A1 — "Share via other apps" tries, in order: the picture file itself, then
 * navigator.share with text + time-limited links, then the Appilix bridge,
 * then the clipboard. Every browser/shell API is stubbed; nothing leaves the
 * test.
 */
describe('shareMessageOutside (VTID-05138 A1)', () => {
  const nav = navigator as unknown as Record<string, unknown>;
  const win = window as unknown as Record<string, unknown>;
  let share: ReturnType<typeof vi.fn>;
  let canShare: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;
  let getLinks: ReturnType<typeof vi.fn>;

  const setNav = (key: string, value: unknown) =>
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });

  const picture = (over: Partial<ShareOutsideInput> = {}): ShareOutsideInput => ({
    text: 'Schau mal',
    images: [{ url: 'https://fresh/a.png', filename: 'a.png' }],
    hasOtherFiles: false,
    getLinks,
    ...over,
  });

  beforeEach(() => {
    share = vi.fn().mockResolvedValue(undefined);
    canShare = vi.fn().mockReturnValue(true);
    writeText = vi.fn().mockResolvedValue(undefined);
    getLinks = vi.fn().mockResolvedValue(['https://signed/a.png?24h']);
    setNav('share', share);
    setNav('canShare', canShare);
    setNav('clipboard', { writeText });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) }));
    h.notify.mockReset();
    h.notifyError.mockReset();
  });
  afterEach(() => {
    delete nav.share;
    delete nav.canShare;
    delete nav.clipboard;
    delete win.appilix;
    vi.unstubAllGlobals();
  });

  it('1) shares the picture file itself when the device can — no link is created', async () => {
    expect(await shareMessageOutside(picture())).toBe('shared_files');
    const arg = share.mock.calls[0][0] as { files: File[]; text: string };
    expect(arg.files[0].name).toBe('a.png');
    expect(arg.text).toBe('Schau mal');
    expect(getLinks).not.toHaveBeenCalled();
  });

  it('2) without file sharing, shares text plus the time-limited link', async () => {
    canShare.mockReturnValue(false);
    expect(await shareMessageOutside(picture())).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Schau mal\nhttps://signed/a.png?24h' });
  });

  it('a non-picture file always goes as a link', async () => {
    expect(await shareMessageOutside(picture({ images: [], hasOtherFiles: true }))).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Schau mal\nhttps://signed/a.png?24h' });
  });

  it('3) without navigator.share, uses the Appilix share bridge', async () => {
    delete nav.share;
    delete nav.canShare;
    const postMessage = vi.fn();
    win.appilix = { postMessage };
    expect(await shareMessageOutside(picture())).toBe('shared');
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({ action: 'share', text: 'Schau mal\nhttps://signed/a.png?24h' });
  });

  it('4) with no share at all, copies the link and says it works for 24 hours', async () => {
    delete nav.share;
    delete nav.canShare;
    expect(await shareMessageOutsideAndNotify(picture())).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Schau mal\nhttps://signed/a.png?24h');
    expect(h.notify).toHaveBeenCalledWith('screens.messages.forwardLinkCopied', undefined, { hours: 24 });
  });

  it('a text-only message shares just its text', async () => {
    expect(await shareMessageOutside(picture({ images: [] }))).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Schau mal' });
    expect(getLinks).not.toHaveBeenCalled();
  });

  it('a cancelled share drawer stops there — nothing else is tried', async () => {
    share.mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    expect(await shareMessageOutside(picture())).toBe('cancelled');
    expect(share).toHaveBeenCalledTimes(1);
    expect(getLinks).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('no link could be created → a translated error, never an empty share', async () => {
    canShare.mockReturnValue(false);
    getLinks.mockResolvedValue([]);
    expect(await shareMessageOutsideAndNotify(picture())).toBe('failed');
    expect(share).not.toHaveBeenCalled();
    expect(h.notifyError).toHaveBeenCalledWith('screens.messages.imageShareFailed');
  });
});
