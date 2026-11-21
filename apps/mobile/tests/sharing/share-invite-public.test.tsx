/**
 * VTID-05646 — the universal share sheet and the share-card capture (`captureRef`), the invite
 * screen, `/creator/onboarded` under the AuthGate and `/pub/campaigns/:id` with no session.
 * Fixture data, the in-memory Supabase double, a fake gateway, a fake device and a fake capture.
 */
import '../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { AuthGate } from '../../src/shell/AuthGate';
import { campaignRow, channelRow, createSharingSupabaseDouble, fakeGateway, installFakeCapture, installFakeDevice, makeSharingWrapper } from './helpers';
import { params, redirects, router, setPathname } from './mocks';
import { UniversalShareSheet } from '../../src/screens/sharing/UniversalShareSheet';
import { ShareCardSheet } from '../../src/screens/sharing/ShareCardSheet';
import { InviteScreen } from '../../src/screens/sharing/InviteScreen';
import { CreatorOnboardedScreen } from '../../src/screens/sharing/CreatorOnboardedScreen';
import { PublicCampaignScreen } from '../../src/screens/sharing/PublicCampaignScreen';
import { __resetInviteLinkCacheForTests } from '../../src/screens/inbox/data/contacts';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';

jest.setTimeout(30000);
afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
afterEach(() => __clearToastsForTests());
const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

const content = { type: 'event' as const, id: 'ev-1', title: 'Breath Workshop', description: 'Slow down together' };

describe('UniversalShareSheet', () => {
  it('opens with the content preview and the personal share buttons', async () => {
    installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { distribution_channels: [channelRow()], campaigns: [] } });
    render(<UniversalShareSheet open onClose={() => undefined} content={content} />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-sheet')).toBeTruthy());
    expect(screen.getByText('Breath Workshop')).toBeTruthy();
    for (const id of ['whatsapp', 'viber', 'email', 'sms', 'copy', 'more']) expect(screen.getByTestId(`share-${id}`)).toBeTruthy();
  });

  it('personal share: WhatsApp opens wa.me with the text and the share link; copy puts the link on the clipboard', async () => {
    const device = installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { distribution_channels: [], campaigns: [] } });
    render(<UniversalShareSheet open onClose={() => undefined} content={content} />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-whatsapp')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('share-message'), 'Join me!');
    await act(async () => fireEvent.press(screen.getByTestId('share-whatsapp')));
    expect(device.opened[0]).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(device.opened[0])).toContain('Join me!');
    expect(decodeURIComponent(device.opened[0])).toContain('/events/ev-1');
    await act(async () => fireEvent.press(screen.getByTestId('share-copy')));
    expect(device.copied).toEqual(['/events/ev-1']);
    await act(async () => fireEvent.press(screen.getByTestId('share-more')));
    expect(device.shared).toHaveLength(1);
  });

  it('blast now needs a distribution channel; with one it writes an active quick-share campaign', async () => {
    installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { distribution_channels: [channelRow({ channel_type: 'linkedin', channel_name: 'LinkedIn' })], campaigns: [] } });
    render(<UniversalShareSheet open onClose={() => undefined} content={content} />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-blast')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('share-blast')));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.selectDistributionChannels');
    fireEvent.press(screen.getByTestId('share-channel-linkedin'));
    await act(async () => fireEvent.press(screen.getByTestId('share-blast')));
    await waitFor(() => expect(d.tables.campaigns).toHaveLength(1));
    expect(d.tables.campaigns[0]).toMatchObject({ name: 'Quick Share - Breath Workshop', status: 'active', target_channels: { linkedin: true }, user_id: 'u-self' });
  });

  it('a social platform that is not connected asks to connect it instead of selecting it', async () => {
    installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { distribution_channels: [], campaigns: [] } });
    render(<UniversalShareSheet open onClose={() => undefined} content={content} />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-channel-instagram')).toBeTruthy());
    fireEvent.press(screen.getByTestId('share-channel-instagram'));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.connectAccount');
  });
});

describe('ShareCardSheet (html2canvas → native capture)', () => {
  const event = { id: 'ev-1', title: 'Breath Workshop', location: 'Berlin', description: 'Slow down together' };

  it('capture: sharing the card renders it to an image with captureRef and hands the file to the share sheet', async () => {
    const device = installFakeDevice();
    const cap = installFakeCapture();
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<ShareCardSheet open onClose={() => undefined} event={event} shareUrl="https://vitanaland.com/events/ev-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-card-sheet')).toBeTruthy());
    expect(screen.getByTestId('share-card-capture')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('share-card-share')));
    expect(cap.captures).toHaveLength(1);
    expect(cap.captures[0].options).toMatchObject({ format: 'png', result: 'tmpfile' });
    expect(device.shared[0]).toMatchObject({ url: 'file:///cache/share-card.png' });
    expect(device.shared[0].message).toContain('/events/ev-1');
  });

  it('the format switch changes the card ratio between story and square', async () => {
    installFakeDevice();
    installFakeCapture();
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<ShareCardSheet open onClose={() => undefined} event={event} shareUrl="https://x.test/e" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-card-capture')).toBeTruthy());
    const ratio = () => (screen.getByTestId('share-card-capture').props.style as Array<{ aspectRatio?: number }>).flat().find((s) => s?.aspectRatio)?.aspectRatio;
    expect(ratio()).toBeCloseTo(9 / 16);
    fireEvent.press(screen.getByTestId('share-card-format-square'));
    expect(ratio()).toBe(1);
  });

  it('without a capture engine the card falls back to sharing the link only', async () => {
    const device = installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<ShareCardSheet open onClose={() => undefined} event={event} shareUrl="https://x.test/e" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('share-card-share')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('share-card-share')));
    expect(device.shared).toHaveLength(1);
    expect(device.shared[0].url).toBeUndefined();
    expect(device.shared[0].message).toContain('https://x.test/e');
  });
});

describe('InviteScreen', () => {
  beforeEach(() => __resetInviteLinkCacheForTests());

  const gateway = (status = 200) =>
    fakeGateway((path) => (path === '/invites/me' ? (status === 200 ? { status, body: { ok: true, url: 'https://vitanaland.com/i/ABC123' } } : { status, body: { error: 'nope' } }) : undefined));

  it('shows the personal invite link and copies / shares it', async () => {
    const device = installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { contacts: [] } });
    render(<InviteScreen />, { wrapper: makeSharingWrapper({ client: d.client, gateway: gateway() }) });
    await waitFor(() => expect(screen.getByText('https://vitanaland.com/i/ABC123')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('invite-copy')));
    expect(device.copied).toEqual(['https://vitanaland.com/i/ABC123']);
    await act(async () => fireEvent.press(screen.getByTestId('invite-share')));
    expect(device.shared[0].message).toContain('https://vitanaland.com/i/ABC123');
  });

  it('a failed link shows the error and keeps copy / share disabled', async () => {
    installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { contacts: [] } });
    render(<InviteScreen />, { wrapper: makeSharingWrapper({ client: d.client, gateway: gateway(500) }) });
    await waitFor(() => expect(screen.getByTestId('invite-link-error')).toBeTruthy());
    expect(screen.getByTestId('invite-copy').props.accessibilityState?.disabled).toBe(true);
    expect(screen.getByTestId('invite-share').props.accessibilityState?.disabled).toBe(true);
  });
});

describe('CreatorOnboardedScreen and its AuthGate', () => {
  const status = (charges: boolean, payouts: boolean) =>
    fakeGateway((path) => (path === '/creators/status' ? { status: 200, body: { stripe_account_id: 'acct', charges_enabled: charges, payouts_enabled: payouts } } : undefined));

  it('fully onboarded: the success state with the two actions', async () => {
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<CreatorOnboardedScreen />, { wrapper: makeSharingWrapper({ client: d.client, gateway: status(true, true) }) });
    await waitFor(() => expect(screen.getByTestId('creator-complete')).toBeTruthy());
    fireEvent.press(screen.getByTestId('creator-first-room'));
    expect(router.navigate).toHaveBeenCalledWith('/community');
    fireEvent.press(screen.getByTestId('creator-payment-settings'));
    expect(router.navigate).toHaveBeenCalledWith('/settings?mode=billing');
  });

  it('still in progress: the pending state refreshes the status', async () => {
    const gw = status(true, false);
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<CreatorOnboardedScreen />, { wrapper: makeSharingWrapper({ client: d.client, gateway: gw }) });
    await waitFor(() => expect(screen.getByTestId('creator-pending')).toBeTruthy());
    const before = gw.calls.length;
    await act(async () => fireEvent.press(screen.getByTestId('creator-refresh')));
    await waitFor(() => expect(gw.calls.length).toBeGreaterThan(before));
  });

  it('a guest is gated away: /creator/onboarded is not a guest path, so the AuthGate redirects to sign-in', async () => {
    redirects.length = 0;
    setPathname('/creator/onboarded');
    const d = createSharingSupabaseDouble({ userId: null, tables: {} });
    render(
      <AuthGate member={<Text>member-area</Text>} guest={<Text>guest-area</Text>} />,
      { wrapper: makeSharingWrapper({ client: d.client }) },
    );
    await waitFor(() => expect(redirects.some((h) => h.startsWith('/maxina?redirectTo='))).toBe(true));
    expect(redirects.at(-1)).toContain(encodeURIComponent('/creator/onboarded'));
    expect(screen.queryByText('member-area')).toBeNull();
    expect(screen.queryByText('guest-area')).toBeNull();
  });

  it('a member passes the gate to the member area', async () => {
    redirects.length = 0;
    setPathname('/creator/onboarded');
    const d = createSharingSupabaseDouble({ tables: {} });
    render(<AuthGate member={<Text>member-area</Text>} guest={<Text>guest-area</Text>} />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('member-area')).toBeTruthy());
  });
});

describe('PublicCampaignScreen (/pub/campaigns/:id, no session)', () => {
  const publicRow = {
    id: 'camp-1',
    name: 'Spring Wellness Launch',
    description: 'Three weeks of posts for a calmer spring.',
    cover_image_url: null,
    status: 'active',
    start_date: '2026-03-01T00:00:00Z',
    end_date: '2026-03-21T00:00:00Z',
    target_channels: ['email', 'sms'],
    metadata: { tenant_slug: 'maxina' },
    created_at: '2026-02-01T00:00:00Z',
    owner_id: 'u-owner',
    owner_name: 'Mara Host',
    owner_avatar: null,
  };

  it('renders from the fixture with no session and joins through the tenant sign-in with a return path', async () => {
    const d = createSharingSupabaseDouble({ userId: null, tables: {}, rpc: { get_public_campaign_details: () => [publicRow] } });
    render(<PublicCampaignScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('public-campaign-screen')).toBeTruthy());
    expect(screen.getByText('Spring Wellness Launch')).toBeTruthy();
    expect(screen.getByText('Three weeks of posts for a calmer spring.')).toBeTruthy();
    expect(d.rpcCalls[0]).toEqual({ name: 'get_public_campaign_details', args: { campaign_id: 'camp-1' } });
    fireEvent.press(screen.getByTestId('public-join-cta'));
    expect(router.navigate).toHaveBeenCalledWith(`/maxina?redirectTo=${encodeURIComponent('/sharing/campaigns/camp-1')}`);
  });

  it('a draft campaign hides its status badge on the public view', async () => {
    const d = createSharingSupabaseDouble({ userId: null, tables: {}, rpc: { get_public_campaign_details: () => [{ ...publicRow, status: 'draft' }] } });
    render(<PublicCampaignScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('public-campaign-screen')).toBeTruthy());
    expect(screen.queryByTestId('public-campaign-status')).toBeNull();
  });

  it('a linked event with tickets turns the event CTA into the ticket action', async () => {
    const d = createSharingSupabaseDouble({
      userId: null,
      tables: {},
      rpc: {
        get_public_campaign_details: () => [{ ...publicRow, metadata: { event_id: 'ev-9' } }],
        get_public_event_details: () => [{ has_tickets: true, lowest_ticket_price: 25, is_paid_event: true, title: 'Breath Workshop', is_sold_out: false }],
      },
    });
    render(<PublicCampaignScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('public-event-cta')).toBeTruthy());
    expect(screen.getByTestId('public-event-cta').props.accessibilityLabel).toContain(en('eventCta.buyTicket'));
    fireEvent.press(screen.getByTestId('public-event-cta'));
    expect(router.navigate).toHaveBeenCalledWith('/pub/events/ev-9');
  });

  it('an unknown campaign shows the not-found state', async () => {
    const d = createSharingSupabaseDouble({ userId: null, tables: {}, rpc: { get_public_campaign_details: () => [] } });
    render(<PublicCampaignScreen id="nope" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('public-campaign-not-found')).toBeTruthy());
    expect(screen.getByText(en('screens.publiccampaignlanding.campaignNotFound'))).toBeTruthy();
  });
});

// keep helpers referenced for tooling
void params;
void campaignRow;
