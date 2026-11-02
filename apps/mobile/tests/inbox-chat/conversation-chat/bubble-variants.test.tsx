/**
 * VTID-05458 fix 1 — the MessageBubble variants the mobile web shows that the
 * first port lacked: the voice player, payment request / exchange & send /
 * confirmation cards (Pay → process_wallet_transfer + the confirmation reply;
 * Decline), the service-booking card, template quick replies, the media album
 * (2 / 3 / 2×2 + "+N"), video and file chips (size, download), legacy
 * `files`, the shared post card (loading / available / unavailable / error +
 * retry), the v2 calendar invite card (POST respond), the legacy invite with
 * its status and Accept / Decline / Maybe, Vitana's Markdown, her action
 * buttons, her companion card (deep link; F4 opens the ORB), in-app event
 * links, Copy (text; a picture-only message takes the "unsupported" path),
 * the full-screen viewer (counter, swipe arrows, download / share / forward)
 * and the forward sheet (targets, copy of the stored file per target, send,
 * share outside). Fake device, Supabase double and gateway fake only.
 */
import '../../helpers/no-network';
import { activateOrb, router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../../src/auth/client';
import { registerChatDevice } from '../../../src/ports/chat-device';
import { __clearToastsForTests, __toastsForTests } from '../../../src/ports/ui';
import { MessageBubble } from '../../../src/screens/chat/MessageBubble';
import { albumLayout, companionCopy } from '../../../src/screens/chat/bubble/Cards';
import { resolveInAppEventPath } from '../../../src/screens/chat/inAppLinks';
import { VITANA_BOT_USER_ID, type ChatViewMessage } from '../../../src/screens/chat/data/types';
import { chatGateway, createChatDouble, fakeDevice, makeChatWrapper, ME, PEER } from './helpers';

afterEach(() => {
  registerChatDevice(null);
  __clearToastsForTests();
  router.navigate.mockClear();
  activateOrb.mockClear();
});
afterAll(() => __setSupabaseForTests(null));

const base = (over: Partial<ChatViewMessage>): ChatViewMessage => ({
  id: 'b1',
  thread_id: PEER,
  sender_id: PEER,
  body: '',
  message_type: 'text',
  created_at: '2026-11-02T09:00:00.000Z',
  sender: { user_id: PEER, display_name: 'Petra Peer' },
  ...over,
});

function renderBubble(
  message: ChatViewMessage,
  extra: Partial<Parameters<typeof MessageBubble>[0]> = {},
  o: { routes?: Record<string, unknown>; tables?: Record<string, Record<string, unknown>[]>; rpc?: Record<string, (a: unknown) => { data: unknown; error: null }>; device?: ReturnType<typeof fakeDevice> } = {},
) {
  const dev = o.device ?? fakeDevice();
  registerChatDevice(dev.device as never);
  const d = createChatDouble({ tables: o.tables, rpc: o.rpc });
  const gw = chatGateway(o.routes ?? {});
  render(<MessageBubble message={message} isOwn={message.sender_id === ME} userId={ME} showSender showTime parent={null} parentUnavailable={false} {...extra} />, {
    wrapper: makeChatWrapper({ client: d.client, gateway: gw }),
  });
  return { d, gw, dev };
}

const longPress = (id: string) => fireEvent(screen.getByTestId(`bubble-body-${id}`), 'longPress');

describe('voice message', () => {
  it('plays the signed URL of the stored voice file, shows m:ss, pauses', async () => {
    const { dev, d } = renderBubble(base({ message_type: 'voice', body: '🎤 Voice message (7s)', content_data: { attachments: [{ type: 'voice', path: `${PEER}/draft/v.m4a`, url: 'https://old', duration: 7 }] } }));
    expect(screen.getByTestId('voice-player-time').props.children).toBe('0:07');
    await waitFor(() => expect(d.storageOps.some((o) => o.op === 'createSignedUrl')).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    fireEvent.press(screen.getByTestId('voice-player-toggle'));
    await waitFor(() => expect(dev.log.players).toHaveLength(1));
    expect(dev.log.players[0].source).toBe(`https://signed.test/chat-attachments/${PEER}/draft/v.m4a`);
    expect(dev.log.players[0].played).toBe(1);
    fireEvent.press(screen.getByTestId('voice-player-toggle'));
    expect(dev.log.players[0].paused).toBe(1);
  });
});

describe('payment cards', () => {
  const request = base({ id: 'p1', message_type: 'payment_request', body: 'Payment request', content_data: { amount: 20, currency: 'USD', description: 'Kino', status: 'pending' } });

  it('the payer sees the amount, the balance and Pay; Pay posts the confirmation and transfers to the requester', async () => {
    const onSendReply = jest.fn(async () => undefined);
    const onUpdateContentData = jest.fn(async () => undefined);
    const { d } = renderBubble(request, { onSendReply, onUpdateContentData }, {
      tables: { user_wallets: [{ user_id: ME, currency_type: 'USD', balance: 50 }] },
      rpc: { process_wallet_transfer: () => ({ data: [{ transaction_id: 'tx-9', from_balance: 30, to_balance: 20 }], error: null }) },
    });
    expect(screen.getByText('$20')).toBeTruthy();
    expect(screen.getByText('Kino')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('payment-balance').props.children).toBe('50'));
    fireEvent.press(screen.getByTestId('payment-pay'));
    await waitFor(() => expect(onUpdateContentData).toHaveBeenCalled());
    expect(onSendReply).toHaveBeenCalledWith('✅ Payment completed: $20 - Kino', 'payment_confirmation', expect.objectContaining({ status: 'completed', completedBy: ME }));
    expect(d.calls.find((c) => c.fn === 'rpc.process_wallet_transfer')?.args[0]).toEqual({ p_from_user_id: ME, p_to_user_id: PEER, p_currency: 'USD', p_amount: 20 });
    expect(onUpdateContentData).toHaveBeenCalledWith('p1', { content_data: expect.objectContaining({ status: 'completed', transactionId: 'tx-9' }) });
  });

  it('Decline posts "❌ Payment declined" and marks the request declined', async () => {
    const onSendReply = jest.fn(async () => undefined);
    const onUpdateContentData = jest.fn(async () => undefined);
    renderBubble({ ...request, id: 'p2' }, { onSendReply, onUpdateContentData });
    fireEvent.press(screen.getByTestId('payment-decline'));
    await waitFor(() => expect(onUpdateContentData).toHaveBeenCalledWith('p2', { content_data: expect.objectContaining({ status: 'declined' }) }));
    expect(onSendReply).toHaveBeenCalledWith('❌ Payment declined: $20 - Kino', 'payment_declined', expect.objectContaining({ status: 'declined', declinedBy: ME }));
  });

  it('too little balance: Pay is disabled with "Insufficient USD balance"', async () => {
    renderBubble({ ...request, id: 'p3' }, { onSendReply: jest.fn(), onUpdateContentData: jest.fn() }, { tables: { user_wallets: [{ user_id: ME, currency_type: 'USD', balance: 5 }] } });
    expect(await screen.findByTestId('payment-insufficient')).toBeTruthy();
    expect(screen.getByTestId('payment-pay').props.accessibilityState?.disabled).toBe(true);
  });

  it('my own request shows no Pay; a confirmation renders the green card with the transaction id', () => {
    renderBubble(base({ id: 'p4', sender_id: ME, message_type: 'payment_confirmation', content_data: { amount: 5, currency: 'CREDITS', description: 'Danke', transactionId: 'tx-1' } }));
    expect(screen.getByTestId('payment-confirmation-card')).toBeTruthy();
    expect(screen.getByText('5 Credits')).toBeTruthy();
    expect(screen.queryByTestId('payment-pay')).toBeNull();
  });

  it('exchange & send shows the rate and both amounts', () => {
    renderBubble(base({ id: 'p5', message_type: 'exchange_and_send', content_data: { originalAmount: 10, originalCurrency: 'USD', exchangedCurrency: 'CREDITS', exchangeRate: 2, status: 'pending' } }), { onSendReply: jest.fn(), onUpdateContentData: jest.fn() });
    expect(screen.getByTestId('exchange-send-card')).toBeTruthy();
    expect(screen.getByText('$10 → 20 Credits')).toBeTruthy();
    expect(screen.getByTestId('exchange-accept')).toBeTruthy();
  });
});

describe('cards with buttons', () => {
  it('service booking: service, provider, text and the action buttons', () => {
    const onAction = jest.fn();
    renderBubble(base({ id: 'sb', message_type: 'service_booking', body: 'Morgen 10 Uhr?', content_data: { service_name: 'Massage', provider_name: 'Spa Eins' }, action_buttons: [{ label: 'Confirm', action: 'booking_confirm' }] }), { onAction });
    expect(screen.getByText('Massage')).toBeTruthy();
    expect(screen.getByText('Spa Eins')).toBeTruthy();
    fireEvent.press(screen.getByTestId('booking-action-0'));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'booking_confirm', messageId: 'sb' }));
  });

  it('template: the text and its quick replies (a tap is a quick_reply action)', () => {
    const onAction = jest.fn();
    renderBubble(base({ id: 'tp', message_type: 'template', body: 'Wie fühlst du dich?', content_data: { quick_replies: ['Gut', 'Müde'] } }), { onAction });
    fireEvent.press(screen.getByTestId('quick-reply-1'));
    expect(onAction).toHaveBeenCalledWith({ type: 'quick_reply', text: 'Müde', messageId: 'tp' });
  });

  it('legacy calendar invite: invitee sees Accept / Decline / Maybe; a tap hands the action with the event to the screen', async () => {
    const onAction = jest.fn(async () => undefined);
    const data = { title: 'Laufen', date: '2026-11-20', time: '18:30', location: 'Park' };
    renderBubble(base({ id: '11111111-1111-4111-8111-111111111111', message_type: 'calendar_invite', body: 'Kommst du?', content_data: data, action_buttons: [{ label: 'Accept', action: 'calendar_accept', data }, { label: 'Decline', action: 'calendar_decline', data }] }), { onAction });
    expect(screen.getByText('Laufen')).toBeTruthy();
    fireEvent.press(await screen.findByTestId('invite-action-calendar_accept'));
    await waitFor(() => expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'calendar_accept', messageId: '11111111-1111-4111-8111-111111111111', messageData: data })));
  });

  it('legacy calendar invite: an existing answer shows its badge instead of the buttons', async () => {
    renderBubble(base({ id: 'inv2', message_type: 'calendar_invite', content_data: { title: 'Yoga' }, action_buttons: [{ label: 'Accept', action: 'calendar_accept' }] }), {}, { tables: { calendar_invite_responses: [{ message_id: 'inv2', user_id: ME, response: 'accept' }] } });
    expect(await screen.findByTestId('invite-status-accepted')).toBeTruthy();
    expect(screen.queryByTestId('invite-action-calendar_accept')).toBeNull();
  });

  it('v2 calendar invite card: GET the state, answer with POST …/respond', async () => {
    const invite = { kind: 'calendar_invite', v: 2, ref_type: 'community_event', ref_id: 'e1', title: 'Sommerfest', start_time: '2099-07-01T16:00:00.000Z', end_time: null, location: 'Garten' };
    const { gw } = renderBubble(base({ id: 'iv', message_type: 'calendar_invite', content_data: invite }), {}, {
      routes: {
        'GET /calendar/invites/iv': { data: { my_response: null, counts: { accepted: 2, maybe: 1, declined: 0 }, is_sender: false } },
        'POST /calendar/invites/iv/respond': { data: { response: 'accepted', action: 'added' } },
      },
    });
    expect(screen.getByText('Sommerfest')).toBeTruthy();
    expect(await screen.findByTestId('calendar-invite-counts')).toBeTruthy();
    fireEvent.press(screen.getByTestId('calendar-invite-accepted'));
    await waitFor(() => expect(gw.requests.find((r) => r.method === 'POST')?.body).toEqual({ response: 'accepted' }));
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'vcal.inviteCard.added')).toBe(true));
  });
});

describe('media', () => {
  const img = (n: number) => ({ type: 'image', path: `${PEER}/${ME}/i${n}.jpg`, filename: `i${n}.jpg`, size: 100 });

  it('albumLayout: 2 → two, 3 → three, 4 → grid, 6 → grid with +3', () => {
    expect(albumLayout(1).variant).toBe('none');
    expect(albumLayout(2)).toEqual({ shown: 2, more: 0, variant: 'two' });
    expect(albumLayout(3)).toEqual({ shown: 3, more: 0, variant: 'three' });
    expect(albumLayout(6)).toEqual({ shown: 4, more: 3, variant: 'grid' });
  });

  it('five pictures form a 2×2 album with "+2"; a tile opens the viewer at that picture with "n of m"', async () => {
    renderBubble(base({ id: 'al', message_type: 'attachment', content_data: { attachments: [img(1), img(2), img(3), img(4), img(5)] } }));
    expect(screen.getByTestId('media-album-grid')).toBeTruthy();
    expect(screen.getByTestId('media-album-more')).toBeTruthy();
    await waitFor(() => expect(screen.queryAllByTestId('media-album-skeleton')).toHaveLength(0), { timeout: 5000 });
    fireEvent.press(screen.getAllByTestId('media-album-tile')[1]);
    expect(await screen.findByTestId('chat-image-viewer')).toBeTruthy();
    expect(screen.getByTestId('chat-image-viewer-counter').props.children).toBe('2 of 5');
    fireEvent.press(screen.getByTestId('chat-image-viewer-next'));
    expect(screen.getByTestId('chat-image-viewer-counter').props.children).toBe('3 of 5');
  });

  it('a file shows its name and size; download opens the fresh signed URL', async () => {
    const { dev } = renderBubble(base({ id: 'fl', message_type: 'attachment', content_data: { attachments: [{ type: 'file', path: `${PEER}/${ME}/doc.pdf`, filename: 'doc.pdf', size: 2048 }] } }));
    expect(screen.getByText('doc.pdf')).toBeTruthy();
    expect(screen.getByText('2 KB')).toBeTruthy();
    await waitFor(
      () => {
        fireEvent.press(screen.getByTestId('chat-file-download'));
        expect(dev.log.opened).toEqual([`https://signed.test/chat-attachments/${PEER}/${ME}/doc.pdf`]);
      },
      { timeout: 5000 },
    );
  });

  it('a video attachment shows the play tile; legacy `files` render like attachments', async () => {
    renderBubble(base({ id: 'vd', message_type: 'attachment', content_data: { attachments: [{ type: 'video', url: 'https://cdn/v.mp4', filename: 'v.mp4' }], files: [{ name: 'alt.pdf', type: 'application/pdf', url: 'https://cdn/alt.pdf', size: 10 }] } }));
    expect(screen.getByTestId('chat-video')).toBeTruthy();
    expect(screen.getByText('alt.pdf')).toBeTruthy();
  });

  it('viewer toolbar: download opens the picture, share opens the share sheet, copy says "unsupported"', async () => {
    const { dev } = renderBubble(base({ id: 'im', message_type: 'attachment', content_data: { attachments: [{ type: 'image', url: 'https://cdn/a.jpg', filename: 'a.jpg' }] } }));
    fireEvent.press(screen.getByTestId('chat-image'));
    fireEvent.press(await screen.findByTestId('chat-image-viewer-download'));
    fireEvent.press(screen.getByTestId('chat-image-viewer-share'));
    fireEvent.press(screen.getByTestId('chat-image-viewer-copy'));
    await waitFor(() => expect(dev.log.opened).toEqual(['https://cdn/a.jpg']));
    expect(dev.log.shared).toEqual([{ url: 'https://cdn/a.jpg' }]);
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'screens.messages.imageCopyUnsupported')).toBe(true));
  });
});

describe('shared content', () => {
  const shared = base({ id: 'sh', message_type: 'shared_content', body: 'Schau mal', content_data: { kind: 'post', id: 'post-1' } });

  it('loads GET /chat/shared-preview?kind&id and opens the in-app path', async () => {
    const { gw } = renderBubble(shared, {}, { routes: { 'GET /chat/shared-preview': { available: true, title: 'Mein Lauf', description: '5 km', image_url: null, url: '/comm/posts/post-1' } } });
    expect(await screen.findByTestId('shared-card')).toBeTruthy();
    expect(gw.requests[0].query).toBe('kind=post&id=post-1');
    expect(screen.getByText('Mein Lauf')).toBeTruthy();
    expect(screen.getByText('Schau mal')).toBeTruthy();
    fireEvent.press(screen.getByTestId('shared-card'));
    expect(router.navigate).toHaveBeenCalled();
  });

  it('a deleted post says so; a failed load offers Retry', async () => {
    renderBubble(shared, {}, { routes: { 'GET /chat/shared-preview': { available: false, reason: 'deleted' } } });
    expect(await screen.findByTestId('shared-card-unavailable-deleted')).toBeTruthy();
  });

  it('a failed preview shows the error with Retry', async () => {
    renderBubble({ ...shared, id: 'sh2' }, {}, { routes: { 'GET /chat/shared-preview': () => ({ status: 500, body: { error: 'x' } }) } });
    expect(await screen.findByTestId('shared-card-retry')).toBeTruthy();
  });
});

describe('Vitana', () => {
  const vitana = (over: Partial<ChatViewMessage>) => base({ sender_id: VITANA_BOT_USER_ID, sender: null, ...over });

  it('renders her Markdown (bold, list) and her navigate action', () => {
    renderBubble(vitana({ id: 'v1', body: '**Hallo** du\n\n- eins\n- zwei', content_data: { actions: [{ kind: 'navigate', route: '/daily-diary', title: 'Tagebuch öffnen' }] } }));
    expect(screen.getByTestId('vitana-markdown')).toBeTruthy();
    expect(screen.getByText('Hallo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-action-0'));
    expect(router.navigate).toHaveBeenCalled();
  });

  it('a member\'s message is never parsed as Markdown', () => {
    renderBubble(base({ id: 'v2', body: '**nicht fett**' }));
    expect(screen.queryByTestId('vitana-markdown')).toBeNull();
    expect(screen.getByText('**nicht fett**')).toBeTruthy();
  });

  it('her companion card shows the card copy and opens its deep link; F4 opens the ORB', () => {
    renderBubble(vitana({ id: 'v3', body: 'Guten Morgen', content_data: { card: { kind: 'vitana_card', v: 1, card_type: 'F3', params: {} } } }));
    expect(screen.getByTestId('vitana-companion-card')).toBeTruthy();
    fireEvent.press(screen.getByTestId('vitana-companion-action-F3'));
    expect(router.navigate).toHaveBeenCalled();
  });

  it('F4 "Talk to Vitana" opens the ORB', () => {
    renderBubble(vitana({ id: 'v4', body: 'Frag mich', content_data: { card: { kind: 'vitana_card', v: 1, card_type: 'F4', params: {} } } }));
    fireEvent.press(screen.getByTestId('vitana-companion-action-F4'));
    expect(activateOrb).toHaveBeenCalled();
  });

  it('companionCopy uses the web card keys and CARD_DEEP_LINKS', () => {
    expect(companionCopy('E1')).toMatchObject({ eyebrow: 'screens.vitanaCards.eyebrowProfile', title: 'screens.vitanaCards.E1.title', to: '/me/profile#avatar' });
    expect(companionCopy('F2', { score: 512 })).toMatchObject({ description: 'chatNative.companion.indexScore', descriptionParams: { score: 512 } });
  });

  it('a card on a member\'s message is ignored', () => {
    renderBubble(base({ id: 'v5', body: 'x', content_data: { card: { kind: 'vitana_card', v: 1, card_type: 'F3' } } }));
    expect(screen.queryByTestId('vitana-companion-card')).toBeNull();
  });
});

describe('links + Copy + Forward', () => {
  it('resolveInAppEventPath maps our event links to the Events path and leaves others alone', () => {
    expect(resolveInAppEventPath('https://vitanaland.com/events/sommerfest')).toBe('/comm/events-meetups?event=sommerfest');
    expect(resolveInAppEventPath('https://e.vitanaland.com/e/abc')).toBe('/comm/events-meetups?event=abc');
    expect(resolveInAppEventPath('https://www.vitanaland.com/comm/events-meetups?event=x%20y')).toBe('/comm/events-meetups?event=x%20y');
    expect(resolveInAppEventPath('https://example.com/events/a')).toBeNull();
    expect(resolveInAppEventPath('https://vitanaland.com/news/a')).toBeNull();
  });

  it('an event link in a message opens the in-app Events route', () => {
    renderBubble(base({ id: 'l1', body: 'Komm mit: https://vitanaland.com/events/sommerfest!' }));
    fireEvent.press(screen.getByTestId('message-event-link'));
    expect(router.navigate).toHaveBeenCalledWith(expect.stringContaining('events-meetups'));
  });

  it('Copy puts the text on the clipboard', () => {
    const { dev } = renderBubble(base({ id: 'c1', body: 'Kopier mich' }));
    longPress('c1');
    fireEvent.press(screen.getByTestId('message-action-copy'));
    expect(dev.log.copied).toEqual(['Kopier mich']);
  });

  it('Copy on a picture-only message takes the "picture copy unsupported" path', async () => {
    renderBubble(base({ id: 'c2', message_type: 'attachment', content_data: { attachments: [{ type: 'image', url: 'https://cdn/a.jpg' }] } }));
    longPress('c2');
    fireEvent.press(screen.getByTestId('message-action-copy'));
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'screens.messages.imageCopyUnsupported')).toBe(true));
  });

  it('voice and cards cannot be forwarded (no Forward action)', () => {
    renderBubble(base({ id: 'f0', message_type: 'voice', content_data: { attachments: [{ type: 'voice', url: 'https://a' }] } }));
    fireEvent(screen.getByTestId('bubble-body-f0'), 'longPress');
    expect(screen.queryByTestId('message-action-forward')).toBeNull();
  });

  it('Forward: lists DMs + groups, copies the stored file for each target, sends with forwarded:true', async () => {
    const { d, gw } = renderBubble(
      base({ id: 'f1', body: 'Schau', message_type: 'attachment', content_data: { attachments: [{ type: 'image', path: `${PEER}/${ME}/a.jpg`, filename: 'a.jpg' }] } }),
      {},
      {
        tables: { global_community_profiles: [{ user_id: 'u-anna', display_name: 'Anna' }] },
        routes: {
          'GET /chat/conversations': { data: [{ peer_id: 'u-anna', last_message: {} }, { peer_id: VITANA_BOT_USER_ID, last_message: {} }] },
          'GET /chat/groups/': { data: [{ id: 'g9', name: 'Läufer' }] },
          'POST /chat/send': { data: { id: 'n1' } },
          'POST /chat/groups/g9/send': { data: { id: 'n2' } },
        },
      },
    );
    longPress('f1');
    fireEvent.press(screen.getByTestId('message-action-forward'));
    expect(await screen.findByTestId('forward-target-dm-u-anna')).toBeTruthy();
    expect(screen.queryByTestId(`forward-target-dm-${VITANA_BOT_USER_ID}`)).toBeNull();
    fireEvent.press(screen.getByTestId('forward-target-dm-u-anna'));
    fireEvent.press(screen.getByTestId('forward-target-group-g9'));
    fireEvent.press(screen.getByTestId('forward-send'));
    await waitFor(() => expect(gw.requests.filter((r) => r.method === 'POST')).toHaveLength(2));
    const copies = d.storageOps.filter((o) => o.op === 'copy');
    expect(copies.map((c) => c.to?.split('/').slice(0, 2).join('/'))).toEqual([`${ME}/u-anna`, `${ME}/g9`]);
    const dmSend = gw.requests.find((r) => r.path === '/chat/send');
    expect(dmSend?.body).toMatchObject({ receiver_id: 'u-anna', content: 'Schau', message_type: 'attachment', content_data: { forwarded: true } });
    expect(gw.requests.find((r) => r.path === '/chat/groups/g9/send')?.body.content_data.forwarded).toBe(true);
    await waitFor(() => expect(__toastsForTests().some((x) => x.titleKey === 'screens.messages.forwardDone')).toBe(true));
  });

  it('Forward → Share via other apps shares the text and a 7-day link to the file', async () => {
    const { dev, d } = renderBubble(base({ id: 'f2', body: 'Hier', message_type: 'attachment', content_data: { attachments: [{ type: 'file', path: `${PEER}/${ME}/d.pdf`, filename: 'd.pdf' }] } }), {}, { routes: { 'GET /chat/conversations': { data: [] }, 'GET /chat/groups/': { data: [] } } });
    longPress('f2');
    fireEvent.press(screen.getByTestId('message-action-forward'));
    expect(await screen.findByTestId('forward-share-link-hint')).toBeTruthy();
    fireEvent.press(screen.getByTestId('forward-share-other'));
    await waitFor(() => expect(dev.log.shared).toHaveLength(1));
    expect(dev.log.shared[0].message).toBe(`Hier\nhttps://signed.test/chat-attachments/${PEER}/${ME}/d.pdf`);
    expect(d.storageOps.find((o) => o.op === 'createSignedUrl' && o.ttl === 7 * 24 * 60 * 60)).toBeTruthy();
  });
});

describe('viewer zoom', () => {
  it('double tap zooms in (and locks the page swipe), a second double tap zooms out', async () => {
    const { fireGestureHandler, getByGestureTestId } = jest.requireActual('react-native-gesture-handler/jest-utils') as typeof import('react-native-gesture-handler/jest-utils');
    const { State } = jest.requireActual('react-native-gesture-handler') as typeof import('react-native-gesture-handler');
    renderBubble(base({ id: 'zm', message_type: 'attachment', content_data: { attachments: [{ type: 'image', url: 'https://cdn/z.jpg', filename: 'z.jpg' }] } }));
    fireEvent.press(screen.getByTestId('chat-image'));
    await screen.findByTestId('chat-image-viewer');
    expect(screen.getByTestId('chat-image-viewer-stage').props.scrollEnabled).toBe(true);
    fireGestureHandler(getByGestureTestId('chat-image-viewer-zoom'), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]);
    await waitFor(() => expect(screen.getByTestId('chat-image-viewer-stage').props.scrollEnabled).toBe(false));
    fireGestureHandler(getByGestureTestId('chat-image-viewer-zoom'), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]);
    await waitFor(() => expect(screen.getByTestId('chat-image-viewer-stage').props.scrollEnabled).toBe(true));
  });
});
