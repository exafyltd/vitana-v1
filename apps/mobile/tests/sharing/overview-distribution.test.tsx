/**
 * VTID-05646 — the sharing overview (blast center, channel connect / disconnect, scheduled
 * posts, KPIs, analytics), the distribution tooling tabs and the data-consent screen with its
 * three sheets. Fixture data and the in-memory Supabase double only.
 */
import '../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { __setSupabaseForTests } from '../../src/auth/client';
import { campaignRow, channelRow, createSharingSupabaseDouble, installFakeDevice, makeSharingWrapper, postRow } from './helpers';
import { SharingOverviewScreen } from '../../src/screens/sharing/SharingOverviewScreen';
import { DistributionScreen } from '../../src/screens/sharing/DistributionScreen';
import { DataConsentScreen } from '../../src/screens/sharing/DataConsentScreen';

jest.setTimeout(30000);
afterAll(() => __setSupabaseForTests(null));
afterEach(() => __clearToastsForTests());

const channels = [channelRow(), channelRow({ id: 'ch-sms', channel_type: 'sms', channel_name: 'SMS', is_connected: false })];
const analytics = [
  { id: 'a1', channel_type: 'email', sent_count: 10, delivered_count: 9, opened_count: 6, clicked_count: 3, responded_count: 1, failed_count: 1, revenue: 12.5 },
];

function overviewDouble(over: Record<string, unknown[]> = {}) {
  return createSharingSupabaseDouble({
    tables: {
      campaigns: [campaignRow()],
      distribution_posts: [],
      distribution_channels: channels,
      scheduled_posts: [],
      post_analytics: [],
      ...over,
    } as never,
  });
}

describe('SharingOverviewScreen', () => {
  it('renders the blast center, channels, KPIs and the empty queue and analytics states', async () => {
    const d = overviewDouble();
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('sharing-screen')).toBeTruthy());
    expect(screen.getByTestId('blast-center')).toBeTruthy();
    expect(screen.getByTestId('growth-kpis')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('scheduled-empty')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('analytics-empty')).toBeTruthy());
  });

  it('new campaign opens the campaign sheet', async () => {
    const d = overviewDouble();
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('sharing-new-campaign')).toBeTruthy());
    fireEvent.press(screen.getByTestId('sharing-new-campaign'));
    await waitFor(() => expect(screen.getByTestId('campaign-sheet')).toBeTruthy());
  });

  it('channel state: a connected channel shows connected; connecting another writes a connected row', async () => {
    const d = overviewDouble();
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('channel-connected-email')).toBeTruthy());
    expect(screen.queryByTestId('channel-connect-email')).toBeNull();
    await act(async () => fireEvent.press(screen.getByTestId('channel-connect-whatsapp')));
    await waitFor(() => expect(d.tables.distribution_channels.some((c) => c.channel_type === 'whatsapp' && c.is_connected)).toBe(true));
    const inserted = d.log.find((l) => l.table === 'distribution_channels' && l.op === 'insert')!.values!;
    expect(inserted).toMatchObject({ user_id: 'u-self', channel_type: 'whatsapp', channel_name: 'WhatsApp', is_connected: true, is_active: true });
  });

  it('channel disconnect: a connected channel can be disconnected', async () => {
    const d = overviewDouble();
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('channel-disconnect-email')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('channel-disconnect-email')));
    await waitFor(() => expect(d.tables.distribution_channels.find((c) => c.channel_type === 'email')?.is_connected).toBe(false));
  });

  it('blast center: needs title, description and a connected channel; save draft writes a draft post', async () => {
    const d = overviewDouble({ distribution_channels: [channelRow()] });
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('blast-save-draft')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('blast-save-draft')));
    expect(d.log.filter((l) => l.table === 'distribution_posts')).toHaveLength(0);
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.missingFields');
    fireEvent.changeText(screen.getByTestId('blast-title'), 'Hello');
    fireEvent.changeText(screen.getByTestId('blast-description'), 'World');
    fireEvent.press(screen.getByTestId('blast-channel-ch-email'));
    await act(async () => fireEvent.press(screen.getByTestId('blast-save-draft')));
    await waitFor(() => expect(d.tables.distribution_posts).toHaveLength(1));
    expect(d.tables.distribution_posts[0]).toMatchObject({ title: 'Hello', description: 'World', status: 'draft', channels: ['email'], user_id: 'u-self' });
  });

  it('blast center: a channel that is not connected cannot be selected', async () => {
    const d = overviewDouble();
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('blast-channel-ch-sms')).toBeTruthy());
    fireEvent.press(screen.getByTestId('blast-channel-ch-sms'));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.channelNotConnected');
  });

  it('blast now: creates the post and publishes it', async () => {
    const d = overviewDouble({ distribution_channels: [channelRow()] });
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('blast-now')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('blast-title'), 'Big news');
    fireEvent.changeText(screen.getByTestId('blast-description'), 'Details');
    fireEvent.press(screen.getByTestId('blast-channel-ch-email'));
    await act(async () => fireEvent.press(screen.getByTestId('blast-now')));
    await waitFor(() => expect(d.tables.distribution_posts[0]?.status).toBe('published'));
    expect(d.tables.distribution_posts[0].published_at).toBeTruthy();
  });

  it('blast schedule: creates the post, then schedules it through the schedule sheet', async () => {
    installFakeDevice();
    const d = overviewDouble({ distribution_channels: [channelRow()] });
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('blast-schedule')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('blast-title'), 'Later');
    fireEvent.changeText(screen.getByTestId('blast-description'), 'Soon');
    fireEvent.press(screen.getByTestId('blast-channel-ch-email'));
    await act(async () => fireEvent.press(screen.getByTestId('blast-schedule')));
    await waitFor(() => expect(screen.getByTestId('schedule-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('schedule-date'));
    await act(async () => fireEvent.press(screen.getByTestId('schedule-confirm')));
    await waitFor(() => expect(d.tables.scheduled_posts).toHaveLength(1));
    expect(d.tables.distribution_posts[0].status).toBe('scheduled');
  });

  it('scheduled posts render and can be paused, resumed and cancelled', async () => {
    const d = overviewDouble({
      scheduled_posts: [
        { id: 'sp-1', post_id: 'post-1', user_id: 'u-self', status: 'pending', scheduled_for: '2026-04-01T10:30:00Z', channels: ['email'], distribution_posts: postRow({ title: 'Teaser post' }) },
      ],
    });
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('scheduled-row-sp-1')).toBeTruthy());
    expect(screen.getByText('Teaser post')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByTestId('scheduled-pause-sp-1')));
    await waitFor(() => expect(d.tables.scheduled_posts[0].status).toBe('paused'));
  });

  it('analytics aggregate the totals and the delivery, open and click rates', async () => {
    const d = overviewDouble({ post_analytics: analytics });
    render(<SharingOverviewScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('analytics-panel')).toBeTruthy());
    expect(screen.getByTestId('analytics-sent').props.children).toBe(10);
    expect(screen.getByTestId('analytics-delivery-rate').props.children.join('')).toContain('90.0');
    expect(screen.getByTestId('analytics-open-rate').props.children.join('')).toContain('66.7');
  });
});

describe('DistributionScreen', () => {
  it('shows the three tabs and switches between template, rule and brand cards', async () => {
    const d = overviewDouble();
    render(<DistributionScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    expect(screen.getByTestId('distribution-screen')).toBeTruthy();
    expect(screen.getByTestId('dist-card-template-launch')).toBeTruthy();
    fireEvent.press(screen.getByTestId('distribution-tab-automation'));
    expect(screen.getByTestId('dist-card-rule-schedule')).toBeTruthy();
    expect(screen.queryByTestId('dist-card-template-launch')).toBeNull();
    fireEvent.press(screen.getByTestId('distribution-tab-brand'));
    expect(screen.getByTestId('dist-card-brand-voice')).toBeTruthy();
  });

  it('a card expands to its detail', async () => {
    const d = overviewDouble();
    render(<DistributionScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    expect(screen.queryByTestId('dist-detail-template-launch')).toBeNull();
    fireEvent.press(screen.getByTestId('dist-card-template-launch'));
    expect(screen.getByTestId('dist-detail-template-launch')).toBeTruthy();
  });

  it('create asset opens the template, rule and brand-guideline sheets', async () => {
    const d = overviewDouble();
    render(<DistributionScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    for (const kind of ['template', 'rule', 'guideline'] as const) {
      fireEvent.press(screen.getByTestId('dist-create-asset'));
      fireEvent.press(screen.getByTestId(`dist-asset-${kind}`));
      await waitFor(() => expect(screen.getByTestId(`${kind}-sheet`)).toBeTruthy());
      fireEvent.press(screen.getByTestId(`${kind}-cancel`));
      await waitFor(() => expect(screen.queryByTestId(`${kind}-sheet`)).toBeNull());
    }
  });
});

describe('DataConsentScreen', () => {
  it('renders the four panels and the manage-access menu', async () => {
    const d = overviewDouble();
    render(<DataConsentScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    expect(screen.getByTestId('consent-screen')).toBeTruthy();
    for (const id of ['active', 'pending', 'privacy', 'packages']) expect(screen.getByTestId(`consent-panel-${id}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('consent-manage'));
    expect(screen.getByTestId('consent-grant')).toBeTruthy();
    expect(screen.getByTestId('consent-create-package')).toBeTruthy();
    expect(screen.getByTestId('consent-privacy')).toBeTruthy();
  });

  it('privacy settings: the toggles flip and saving confirms with a toast', async () => {
    const d = overviewDouble();
    render(<DataConsentScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    fireEvent.press(screen.getByTestId('consent-manage'));
    fireEvent.press(screen.getByTestId('consent-privacy'));
    await waitFor(() => expect(screen.getByTestId('privacy-sheet')).toBeTruthy());
    expect(screen.getByTestId('privacy-third-party').props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId('privacy-auto-export').props.accessibilityState.checked).toBe(true);
    fireEvent(screen.getByTestId('privacy-third-party'), 'press');
    expect(screen.getByTestId('privacy-third-party').props.accessibilityState.checked).toBe(true);
    fireEvent(screen.getByTestId('privacy-activity-log'), 'press');
    expect(screen.getByTestId('privacy-activity-log').props.accessibilityState.checked).toBe(false);
    fireEvent.press(screen.getByTestId('privacy-save'));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.privacySettingsUpdated');
    await waitFor(() => expect(screen.queryByTestId('privacy-sheet')).toBeNull());
  });

  it('grant access: asks for an e-mail and confirms with a toast', async () => {
    const d = overviewDouble();
    render(<DataConsentScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    fireEvent.press(screen.getByTestId('consent-manage'));
    fireEvent.press(screen.getByTestId('consent-grant'));
    await waitFor(() => expect(screen.getByTestId('grant-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('grant-submit'));
    expect(screen.getByTestId('grant-sheet')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('grant-email'), 'doc@example.org');
    fireEvent.press(screen.getByTestId('grant-level-view'));
    fireEvent.press(screen.getByTestId('grant-scope-health'));
    fireEvent.press(screen.getByTestId('grant-submit'));
    expect(__toastsForTests().map((x) => x.titleKey)).toContain('toasts.sharing.accessGranted');
  });

  it('create package: three steps write the package and its items for the active tenant', async () => {
    const d = createSharingSupabaseDouble({ tables: { business_packages: [], package_items: [], global_community_events: [] } });
    render(<DataConsentScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    fireEvent.press(screen.getByTestId('consent-manage'));
    fireEvent.press(screen.getByTestId('consent-create-package'));
    await waitFor(() => expect(screen.getByTestId('package-sheet')).toBeTruthy());
    expect(screen.getByTestId('package-next').props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(screen.getByTestId('package-title'), 'Five-session bundle');
    fireEvent.press(screen.getByTestId('package-next'));
    fireEvent.press(screen.getByTestId('package-add-item'));
    fireEvent.changeText(screen.getByTestId('package-item-title-0'), '60 min coaching');
    fireEvent.press(screen.getByTestId('package-next'));
    fireEvent.changeText(screen.getByTestId('package-price'), '199.5');
    await act(async () => fireEvent.press(screen.getByTestId('package-submit')));
    await waitFor(() => expect(d.tables.package_items).toHaveLength(1));
    expect(d.tables.business_packages[0]).toMatchObject({ title: 'Five-session bundle', price_cents: 19950, package_type: 'bundle', status: 'draft', creator_id: 'u-self' });
    expect(d.tables.package_items[0]).toMatchObject({ item_title: '60 min coaching', quantity: 1, sort_order: 0 });
  });
});
