/**
 * VTID-05138 — forwarding a chat message.
 *
 * Pins: each attachment is copied into `{me}/{target}/…` for each target
 * before that target's message is sent; the message carries
 * `content_data.forwarded = true`; targets run one after another; a failed
 * copy skips that target (nothing half-sent) with a translated error, and the
 * other targets still get theirs; voice/audio attachments are never
 * forwarded; the picker caps the selection at five. Supabase and the chat API
 * are mocked — nothing leaves the test.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const h = vi.hoisted(() => ({
  log: [] as string[],
  copy: vi.fn(),
  sendChatMessage: vi.fn(),
  sendGroupMessage: vi.fn(),
  threads: [] as unknown[],
  groups: [] as unknown[],
  notify: vi.fn(),
  notifyError: vi.fn(),
  sign: vi.fn(),
  shareOutside: vi.fn(),
}));

vi.mock('@/lib/i18n-toast', async () => ({
  ...(await vi.importActual<typeof import('@/lib/i18n-toast')>('@/lib/i18n-toast')),
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: h.notify,
  notifyError: h.notifyError,
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({}) } } }));
vi.mock('@/lib/fileUpload', () => ({ copyChatAttachmentForThread: h.copy, getSignedAttachmentUrl: h.sign }));
vi.mock('@/lib/chatImageActions', async () => ({
  ...(await vi.importActual<typeof import('@/lib/chatImageActions')>('@/lib/chatImageActions')),
  shareMessageOutsideAndNotify: h.shareOutside,
}));
vi.mock('@/hooks/useChatApi', () => ({
  fetchGroups: async () => h.groups,
  sendChatMessage: h.sendChatMessage,
  sendGroupMessage: h.sendGroupMessage,
}));
vi.mock('@/hooks/useGlobalMessages', () => ({ buildGlobalThreadsQueryFn: async () => h.threads }));
vi.mock('@/hooks/useChatGroupsAsThreads', () => ({ chatGroupsQueryKey: (id?: string) => ['chat-groups', id] }));

import {
  createShareLinks,
  ForwardMessageSheet,
  forwardToTargets,
  MAX_FORWARD_TARGETS,
  type ForwardPayload,
  type ForwardTarget,
} from './ForwardMessageSheet';
import { FORWARD_SHARE_LINK_TTL_S } from '@/lib/chatImageActions';

const DM: ForwardTarget = { kind: 'dm', id: 'u-anna', name: 'Anna' };
const GROUP: ForwardTarget = { kind: 'group', id: 'g-walk', name: 'Walking Club' };
const PICTURE = { type: 'image', path: 'other/me/1_a.png', url: 'https://old/a.png', filename: 'a.png', mime: 'image/png', size: 10 };

beforeEach(() => {
  h.log.length = 0;
  [h.copy, h.sendChatMessage, h.sendGroupMessage, h.notify, h.notifyError, h.sign, h.shareOutside].forEach((f) => f.mockReset());
  h.copy.mockImplementation(async (src: string, me: string, target: string) => {
    h.log.push(`copy:${target}`);
    return { path: `${me}/${target}/new_a.png`, url: `https://signed/${target}/new_a.png` };
  });
  h.sendChatMessage.mockImplementation(async (id: string) => {
    h.log.push(`send:${id}`);
    return {};
  });
  h.sendGroupMessage.mockImplementation(async (id: string) => {
    h.log.push(`send:${id}`);
    return {};
  });
});

describe('forwardToTargets (VTID-05138)', () => {
  it('copies the attachment for each target, then sends it marked as forwarded — one target after another', async () => {
    const result = await forwardToTargets([DM, GROUP], { body: 'Schau mal', attachments: [PICTURE] }, 'me');

    expect(result.sent).toEqual([DM, GROUP]);
    expect(h.log).toEqual(['copy:u-anna', 'send:u-anna', 'copy:g-walk', 'send:g-walk']);
    expect(h.copy).toHaveBeenCalledWith('other/me/1_a.png', 'me', 'u-anna');
    expect(h.sendChatMessage).toHaveBeenCalledWith('u-anna', 'Schau mal', {
      messageType: 'attachment',
      contentData: { forwarded: true, attachments: [{ ...PICTURE, path: 'me/u-anna/new_a.png', url: 'https://signed/u-anna/new_a.png' }] },
    });
    expect(h.sendGroupMessage).toHaveBeenCalledWith('g-walk', 'Schau mal', {
      messageType: 'attachment',
      contentData: { forwarded: true, attachments: [{ ...PICTURE, path: 'me/g-walk/new_a.png', url: 'https://signed/g-walk/new_a.png' }] },
    });
  });

  it('forwards plain text as a text message', async () => {
    await forwardToTargets([DM], { body: 'Hallo', attachments: [] }, 'me');
    expect(h.copy).not.toHaveBeenCalled();
    expect(h.sendChatMessage).toHaveBeenCalledWith('u-anna', 'Hallo', { messageType: 'text', contentData: { forwarded: true } });
  });

  it('skips a target whose copy fails, tells the member, and still sends to the others', async () => {
    h.copy.mockImplementationOnce(async () => {
      throw new Error('storage 403');
    });
    const result = await forwardToTargets([DM, GROUP], { body: '', attachments: [PICTURE] }, 'me');

    expect(result.failed).toEqual([DM]);
    expect(result.sent).toEqual([GROUP]);
    expect(h.sendChatMessage).not.toHaveBeenCalled();
    expect(h.sendGroupMessage).toHaveBeenCalledTimes(1);
    expect(h.notifyError).toHaveBeenCalledWith('screens.messages.forwardFailedFor', undefined, { name: 'Anna' });
  });

  it('never forwards voice or audio attachments', async () => {
    await forwardToTargets(
      [DM],
      { body: 'Text', attachments: [{ type: 'voice', path: 'other/me/v.webm', mime: 'audio/webm' }] },
      'me',
    );
    expect(h.copy).not.toHaveBeenCalled();
    expect(h.sendChatMessage).toHaveBeenCalledWith('u-anna', 'Text', { messageType: 'text', contentData: { forwarded: true } });
  });

  it('never sends to more than five targets', async () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ kind: 'dm' as const, id: `u${i}`, name: `U${i}` }));
    await forwardToTargets(many, { body: 'x', attachments: [] }, 'me');
    expect(h.sendChatMessage).toHaveBeenCalledTimes(MAX_FORWARD_TARGETS);
  });
});

describe('ForwardMessageSheet (VTID-05138)', () => {
  function renderSheet() {
    const onOpenChange = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ForwardMessageSheet open onOpenChange={onOpenChange} payload={{ body: 'Hallo', attachments: [] }} />
      </QueryClientProvider>,
    );
    return { onOpenChange };
  }

  beforeEach(() => {
    h.threads = Array.from({ length: 6 }, (_, i) => ({
      id: `u${i}`,
      type: 'direct',
      participants: [{ user_id: `u${i}`, display_name: `Mitglied ${i}` }],
    }));
    h.groups = [{ id: 'g-walk', name: 'Walking Club' }];
  });

  it('caps the selection at five and sends to each picked chat', async () => {
    const { onOpenChange } = renderSheet();
    const dmButtons = await screen.findAllByTestId('forward-target-dm');
    expect(dmButtons).toHaveLength(6);

    dmButtons.slice(0, 5).forEach((b) => fireEvent.click(b));
    expect(dmButtons[5]).toHaveProperty('disabled', true);
    expect(screen.getByTestId('forward-target-group')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('forward-send').textContent).toBe('screens.messages.forwardSendCount:{"count":5}');

    fireEvent.click(screen.getByTestId('forward-send'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(h.sendChatMessage).toHaveBeenCalledTimes(5);
    expect(h.sendChatMessage).toHaveBeenCalledWith('u0', 'Hallo', { messageType: 'text', contentData: { forwarded: true } });
    expect(h.notify).toHaveBeenCalledWith('screens.messages.forwardDone');
  });

  it('sends nothing until a chat is picked', async () => {
    renderSheet();
    await screen.findAllByTestId('forward-target-dm');
    expect(screen.getByTestId('forward-send')).toHaveProperty('disabled', true);
    expect(h.sendChatMessage).not.toHaveBeenCalled();
  });
});

describe('ForwardMessageSheet — share via other apps (VTID-05138 A1)', () => {
  function renderSheet(payload: ForwardPayload, aboveViewer = false) {
    const onOpenChange = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ForwardMessageSheet open onOpenChange={onOpenChange} payload={payload} aboveViewer={aboveViewer} />
      </QueryClientProvider>,
    );
    return { onOpenChange };
  }

  beforeEach(() => {
    h.threads = [];
    h.groups = [];
  });

  it('shows both parts: the MAXINA picker and the share-via-other-apps button with the link expiry', async () => {
    renderSheet({ body: '', attachments: [PICTURE], shareImages: [{ url: 'https://fresh/a.png', filename: 'a.png' }] });
    expect(await screen.findByText('screens.messages.forwardInMaxina')).toBeTruthy();
    expect(screen.getByTestId('forward-target-list')).toBeTruthy();
    expect(screen.getByTestId('forward-share-other').textContent).toContain('screens.messages.forwardShareOther');
    expect(screen.getByTestId('forward-share-link-hint').textContent).toBe('screens.messages.forwardShareLinkHint:{"hours":24}');
  });

  it('says nothing about links for a text-only message', async () => {
    renderSheet({ body: 'Hallo', attachments: [] });
    await screen.findByTestId('forward-share-other');
    expect(screen.queryByTestId('forward-share-link-hint')).toBeNull();
  });

  it('opened from the viewer, it sits above it (z-150 on sheet and overlay)', async () => {
    renderSheet({ body: 'Hallo', attachments: [] }, true);
    const sheet = await screen.findByTestId('forward-message-sheet');
    expect(sheet.className).toContain('z-[150]');
    expect(sheet.className).not.toMatch(/(^|\s)z-50(\s|$)/);
    expect(document.querySelector('.fixed.inset-0.z-\\[150\\]')).toBeTruthy();
  });

  it('share passes the text, the fresh pictures and a link factory, then closes the sheet', async () => {
    h.shareOutside.mockResolvedValue('shared');
    h.sign.mockResolvedValue('https://signed/24h/a.png');
    const { onOpenChange } = renderSheet({
      body: 'Schau mal',
      attachments: [PICTURE],
      shareImages: [{ url: 'https://fresh/a.png', filename: 'a.png' }],
    });
    fireEvent.click(await screen.findByTestId('forward-share-other'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const input = h.shareOutside.mock.calls[0][0];
    expect(input.text).toBe('Schau mal');
    expect(input.images).toEqual([{ url: 'https://fresh/a.png', filename: 'a.png' }]);
    expect(input.hasOtherFiles).toBe(false);
    expect(h.sign).not.toHaveBeenCalled(); // links only when the helper asks for them
    expect(await input.getLinks()).toEqual(['https://signed/24h/a.png']);
    expect(h.sign).toHaveBeenCalledWith('other/me/1_a.png', FORWARD_SHARE_LINK_TTL_S);
    expect(h.sendChatMessage).not.toHaveBeenCalled();
  });

  it('a cancelled share leaves the sheet open', async () => {
    h.shareOutside.mockResolvedValue('cancelled');
    const { onOpenChange } = renderSheet({ body: 'Hallo', attachments: [] });
    fireEvent.click(await screen.findByTestId('forward-share-other'));
    await waitFor(() => expect(h.shareOutside).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe('createShareLinks (VTID-05138 A1)', () => {
  it('signs each stored file for 24 hours, skips audio, keeps a plain URL as is', async () => {
    h.sign.mockImplementation(async (path: string) => `https://signed/${path}`);
    const links = await createShareLinks([
      PICTURE,
      { type: 'voice', path: 'other/me/v.webm', mime: 'audio/webm' },
      { type: 'image', url: 'https://cdn.example/x.jpg' },
    ]);
    expect(links).toEqual(['https://signed/other/me/1_a.png', 'https://cdn.example/x.jpg']);
    expect(h.sign).toHaveBeenCalledTimes(1);
    expect(h.sign).toHaveBeenCalledWith('other/me/1_a.png', 24 * 60 * 60);
  });
});
