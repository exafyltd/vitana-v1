/**
 * VTID-05321 (messenger-ux-v2/ui-shared-cards, R11) — "Send in message":
 * every entry point (post, event, product drawer + page, profile) sends one
 * `shared_content` message carrying only `{ kind, id }` (plus the optional
 * caption) to each picked chat; the sheet uses the forward sheet's target
 * list; failures are reported per target; MessageBubble renders the card.
 * Everything is mocked; nothing is sent.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const sendChatMessage = vi.fn(async (..._a: unknown[]) => ({ id: 'srv' }));
const sendGroupMessage = vi.fn(async (..._a: unknown[]) => ({ id: 'srv' }));
const notify = vi.fn();
const notifyError = vi.fn();
const refreshTargets = vi.fn();

vi.mock('@/hooks/useChatApi', () => ({
  sendChatMessage: (...a: unknown[]) => sendChatMessage(...a),
  sendGroupMessage: (...a: unknown[]) => sendGroupMessage(...a),
  fetchGroups: vi.fn(async () => []),
}));
vi.mock('@/components/messages/forwardTargets', async (orig) => ({
  ...(await orig<typeof import('@/components/messages/forwardTargets')>()),
  useChatTargets: () => ({
    userId: 'me',
    loading: false,
    refreshTargets,
    targets: [
      { kind: 'dm', id: 'u-anna', name: 'Anna' },
      { kind: 'group', id: 'g-club', name: 'Hiking club' },
    ],
  }),
}));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: (...a: unknown[]) => notify(...a),
  notifyError: (...a: unknown[]) => notifyError(...a),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/integrations/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      channel: () => channel,
      removeChannel: vi.fn(),
      from: () => ({}),
      auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
    },
  };
});
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k, t: (k: string) => k }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useMessageReactions', () => ({
  useMessageReactions: () => ({ reactionSummary: [], addReaction: vi.fn(), removeReaction: vi.fn() }),
}));
// Entry-point neighbours that are not under test.
vi.mock('@/components/home/NewsPostModerationMenu', () => ({ NewsPostModerationMenu: () => null }));
vi.mock('@/components/home/PostLikersDialog', () => ({ PostLikersDialog: () => null }));
vi.mock('@/components/media/FeedMedia', () => ({ FeedMedia: () => null }));
vi.mock('@/components/feed/MentionText', () => ({ renderMentions: (c: string) => c }));
vi.mock('@/hooks/useMentionCandidates', () => ({ useMentionCandidates: () => ({ data: [], isLoading: false, fetchStatus: 'idle' }) }));
vi.mock('@/hooks/useFeedPostInteractions', () => ({
  useFeedPostInteractions: () => ({
    isLiked: false, toggleLike: vi.fn(), comments: [], commentsLoading: false, addComment: vi.fn(),
    isAddingComment: false, deleteComment: vi.fn(), toggleCommentLike: vi.fn(),
  }),
}));
vi.mock('@/components/cart/AddToCartButton', () => ({ AddToCartButton: () => null }));
vi.mock('@/components/discover/RecommendButton', () => ({ RecommendButton: () => null }));
vi.mock('@/components/sharing/UniversalShareButton', () => ({ UniversalShareButton: () => null }));
vi.mock('@/components/discover/AffiliateDisclosure', () => ({ AffiliateDisclosure: () => null }));
vi.mock('@/components/bookmarks/BookmarkButton', () => ({ BookmarkButton: () => null }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => false }));
const product = { id: 'prod-1', title: 'Yoga mat', description: 'Grippy', images: [], price_cents: 2500, currency: 'EUR', brand: 'B', category: 'c' };
vi.mock('@/hooks/useMarketplace', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useMarketplace')>()),
  useMarketplaceProduct: () => ({ data: { ok: true, product }, isLoading: false, error: null }),
}));

import { sendSharedToTargets, SendInMessageSheet } from './SendInMessageSheet';
import MessageBubble from './MessageBubble';
import { CommunityPostCard } from '@/components/home/CommunityPostCard';
import { EventKebabMenu } from '@/components/events/EventKebabMenu';
import { ProductDetailsBody } from '@/components/discover/ProductDetailsDrawer';
import ProductDetail from '@/pages/discover/ProductDetail';
import { ShareProfileSheet } from '@/components/profile/shared/ShareProfileSheet';
import type { PostFeedItem } from '@/lib/news-feed-ranker';

const UUID = /^[0-9a-f-]{36}$/;

beforeEach(() => {
  sendChatMessage.mockClear();
  sendGroupMessage.mockClear();
  sendChatMessage.mockImplementation(async () => ({ id: 'srv' }));
  notify.mockClear();
  notifyError.mockClear();
  refreshTargets.mockClear();
});

function wrap(ui: React.ReactElement, path = '/x', route = '*') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path={route} element={ui} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Pick Anna and the group in the open sheet and send. */
async function pickBothAndSend(caption?: string) {
  const sheet = await screen.findByTestId('send-in-message-sheet');
  fireEvent.click(sheet.querySelector('[data-testid="forward-target-dm"]')!);
  fireEvent.click(sheet.querySelector('[data-testid="forward-target-group"]')!);
  if (caption) fireEvent.change(screen.getByTestId('send-in-message-caption'), { target: { value: caption } });
  fireEvent.click(screen.getByTestId('send-in-message-send'));
  await waitFor(() => expect(notify).toHaveBeenCalledWith('inbox.shared.sent'));
}

function expectSent(kind: string, id: string, caption = '') {
  expect(sendChatMessage).toHaveBeenCalledTimes(1);
  expect(sendGroupMessage).toHaveBeenCalledTimes(1);
  const [dmTo, dmBody, dmOpts] = sendChatMessage.mock.calls[0] as [string, string, Record<string, unknown>];
  const [gTo, gBody, gOpts] = sendGroupMessage.mock.calls[0] as [string, string, Record<string, unknown>];
  expect([dmTo, gTo]).toEqual(['u-anna', 'g-club']);
  expect([dmBody, gBody]).toEqual([caption, caption]);
  for (const o of [dmOpts, gOpts]) {
    expect(o.messageType).toBe('shared_content');
    expect(o.contentData).toEqual({ kind, id }); // only the reference — no title / image copied
    expect(o.clientMessageId).toMatch(UUID);
  }
}

describe('sendSharedToTargets', () => {
  it('sends { kind, id } and the caption to each target, one after another', async () => {
    const r = await sendSharedToTargets(
      [{ kind: 'dm', id: 'u-anna', name: 'Anna' }, { kind: 'group', id: 'g-club', name: 'Club' }],
      { kind: 'event', id: 'e1' },
      '  see you there  ',
    );
    expect(r.failed).toEqual([]);
    expectSent('event', 'e1', 'see you there');
  });

  it('one failed target is reported by name and the others still go out', async () => {
    sendChatMessage.mockRejectedValueOnce(new Error('Gateway 500'));
    const r = await sendSharedToTargets(
      [{ kind: 'dm', id: 'u-anna', name: 'Anna' }, { kind: 'group', id: 'g-club', name: 'Club' }],
      { kind: 'post', id: 'p1' },
      '',
    );
    expect(r.failed.map((x) => x.id)).toEqual(['u-anna']);
    expect(r.sent.map((x) => x.id)).toEqual(['g-club']);
    expect(notifyError).toHaveBeenCalledWith('screens.messages.forwardFailedFor', undefined, { name: 'Anna' });
  });

  it('"not allowed" (the sender can no longer see the item) stops and says so once', async () => {
    sendChatMessage.mockRejectedValueOnce(new Error('share_not_allowed'));
    const r = await sendSharedToTargets(
      [{ kind: 'dm', id: 'u-anna', name: 'Anna' }, { kind: 'group', id: 'g-club', name: 'Club' }],
      { kind: 'post', id: 'p1' },
      '',
    );
    expect(sendGroupMessage).not.toHaveBeenCalled();
    expect(r.failed).toHaveLength(2);
    expect(notifyError).toHaveBeenCalledWith('inbox.shared.notAllowed');
  });
});

describe('SendInMessageSheet', () => {
  it('uses the forward target list, sends with the caption and closes', async () => {
    const onOpenChange = vi.fn();
    wrap(<SendInMessageSheet open onOpenChange={onOpenChange} item={{ kind: 'profile', id: 'u-bob' }} itemTitle="Bob" />);
    expect(screen.getByTestId('forward-target-list')).toBeTruthy();
    await pickBothAndSend('meet Bob');
    expectSent('profile', 'u-bob', 'meet Bob');
    expect(refreshTargets).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps a failed target selected for a retry', async () => {
    sendGroupMessage.mockRejectedValueOnce(new Error('Gateway 500'));
    const onOpenChange = vi.fn();
    wrap(<SendInMessageSheet open onOpenChange={onOpenChange} item={{ kind: 'post', id: 'p1' }} />);
    await pickBothAndSend();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByTestId('forward-target-group').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('forward-target-dm').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('entry points send shared_content { kind, id }', () => {
  it('community post', async () => {
    const item = {
      id: 'post-p1', kind: 'post', source: 'post', post_id: 'p1', user_id: 'author', author_name: 'A', author_avatar: null,
      content: 'Hallo', image_url: null, video_url: null, background_style: null, mentions: [], likes_count: 0,
      comments_count: 0, followed: false, tags: [], published_at: '2026-10-01T10:00:00Z',
    } as unknown as PostFeedItem;
    wrap(<CommunityPostCard item={item} />);
    fireEvent.click(screen.getByTestId('post-send-in-message'));
    await pickBothAndSend();
    expectSent('post', 'p1');
  });

  it('a media upload card has no entry (not a shareable post)', () => {
    const item = { id: 'm', kind: 'post', source: 'media', post_id: 'm1', user_id: 'a', author_name: 'A', content: '', mentions: [], tags: [], likes_count: 0, comments_count: 0 } as unknown as PostFeedItem;
    wrap(<CommunityPostCard item={item} />);
    expect(screen.queryByTestId('post-send-in-message')).toBeNull();
  });

  it('event (visitor button and creator menu)', async () => {
    const event = { id: 'e1', title: 'Yoga', created_by: 'someone', start_time: '2099-01-01T10:00:00Z' };
    const { unmount } = wrap(<EventKebabMenu event={event} currentUserId="me" />);
    fireEvent.click(screen.getByTestId('event-send-in-message'));
    await pickBothAndSend();
    expectSent('event', 'e1');
    unmount();

    sendChatMessage.mockClear();
    sendGroupMessage.mockClear();
    notify.mockClear();
    wrap(<EventKebabMenu event={{ ...event, created_by: 'me' }} currentUserId="me" onEdit={vi.fn()} />);
    fireEvent.pointerDown(screen.getByRole('button'), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByTestId('event-send-in-message'));
    await pickBothAndSend();
    expectSent('event', 'e1');
  });

  it('event: signed out, no entry', () => {
    wrap(<EventKebabMenu event={{ id: 'e1', created_by: 'x' }} currentUserId={null} />);
    expect(screen.queryByTestId('event-send-in-message')).toBeNull();
  });

  it('product quick view (drawer body)', async () => {
    wrap(<ProductDetailsBody product={product as never} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('product-send-in-message'));
    await pickBothAndSend();
    expectSent('product', 'prod-1');
  });

  it('product page', async () => {
    wrap(<ProductDetail />, '/discover/product/prod-1', '/discover/product/:id');
    fireEvent.click(screen.getByTestId('product-send-in-message'));
    await pickBothAndSend();
    expectSent('product', 'prod-1');
  });

  it('profile share sheet (by the member\'s user id)', async () => {
    const onOpenChange = vi.fn();
    const uid = '0f8fad5b-d9cb-469f-a165-70867728950e';
    wrap(
      <ShareProfileSheet
        isOpen
        onOpenChange={onOpenChange}
        profile={{ id: 'current-user', user_id: uid, name: 'Bob', handle: 'bob', roles: [] } as never}
        shareUrl="https://x/u/bob"
        onShowQR={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('profile-send-in-message'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await pickBothAndSend();
    expectSent('profile', uid);
  });
});

describe('MessageBubble renders shared_content as a card', () => {
  it('the card plus the caption; a malformed one falls back to text', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, available: false, reason: 'deleted' }) }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const msg = { id: 'm1', sender_id: 'peer', body: 'look at this', content: 'look at this', message_type: 'shared_content', content_data: { kind: 'post', id: 'p1' }, created_at: '2026-10-21T10:00:00Z', thread_id: 'peer' };
      const { unmount } = wrap(<MessageBubble message={msg as never} isOwnMessage={false} />);
      expect(screen.getByTestId('shared-content-message').textContent).toContain('look at this');
      await screen.findByTestId('shared-card-unavailable');
      unmount();

      wrap(<MessageBubble message={{ ...msg, content_data: { kind: 'nope' } } as never} isOwnMessage={false} />);
      expect(screen.queryByTestId('shared-content-message')).toBeNull();
      expect(screen.getByText('look at this')).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
