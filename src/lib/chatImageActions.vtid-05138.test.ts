/**
 * VTID-05138 — which chat messages can be forwarded.
 * Text and attachment messages yes; voice (new or legacy format) and cards
 * whose actions a forwarded copy would silently drop, no.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/i18n-toast', () => ({ notify: vi.fn(), notifyError: vi.fn() }));

import { canForwardMessage, isImageAttachment, isVoiceMessage } from './chatImageActions';

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
