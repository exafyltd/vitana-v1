/**
 * VTID-05646 — native campaigns: the list (loaded / empty / error, edit sheet, bulk actions,
 * duplicate, delete) and the detail (stats, activate / pause / resume / complete, schedule and
 * publish a post, create a post, not-found). Fixture data and the in-memory Supabase double only.
 */
import '../helpers/no-network';
import './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { campaignRow, createSharingSupabaseDouble, installFakeDevice, makeSharingWrapper, postRow } from './helpers';
import { router } from './mocks';
import { CampaignsScreen } from '../../src/screens/sharing/CampaignsScreen';
import { CampaignDetailScreen } from '../../src/screens/sharing/CampaignDetailScreen';

jest.setTimeout(30000);
afterAll(() => __setSupabaseForTests(null));
const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

const two = [campaignRow(), campaignRow({ id: 'camp-2', name: 'Autumn Reset', status: 'active' })];

describe('CampaignsScreen', () => {
  it('loaded: lists campaigns with their status and post counts', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [postRow(), postRow({ id: 'post-2', status: 'published' })] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Spring Wellness Launch')).toBeTruthy());
    expect(screen.getByText('Autumn Reset')).toBeTruthy();
    expect(screen.getByTestId('campaign-card-camp-1')).toBeTruthy();
    expect([screen.getByTestId('campaign-posts-camp-1').props.children].flat().join('')).toContain('2');
  });

  it('empty: shows the first-campaign state and opens the create sheet from it', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: [], distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('campaigns-empty')).toBeTruthy());
    expect(screen.getByText(en('screens.sharing.noCampaignsYet'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('campaigns-empty-create'));
    await waitFor(() => expect(screen.getByTestId('campaign-sheet')).toBeTruthy());
  });

  it('error: shows the error state with a retry that reloads', async () => {
    const failing = ['campaigns'];
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] }, failTables: failing });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('campaigns-error')).toBeTruthy());
    failing.length = 0;
    fireEvent.press(screen.getByTestId('campaigns-retry'));
    await waitFor(() => expect(screen.getByText('Autumn Reset')).toBeTruthy());
  });

  it('create: the four-step sheet saves a draft campaign with the chosen channels', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: [], distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('campaigns-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaigns-new'));
    await waitFor(() => expect(screen.getByTestId('campaign-sheet')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('campaign-name'), 'Winter Immunity');
    fireEvent.changeText(screen.getByTestId('campaign-description'), 'Defence tips');
    fireEvent.press(screen.getByTestId('campaign-next'));
    fireEvent.press(screen.getByTestId('campaign-channel-email'));
    fireEvent.press(screen.getByTestId('campaign-next'));
    fireEvent.press(screen.getByTestId('campaign-template-launch'));
    fireEvent.press(screen.getByTestId('campaign-next'));
    await act(async () => fireEvent.press(screen.getByTestId('campaign-save')));
    await waitFor(() => expect(d.log.some((l) => l.table === 'campaigns' && l.op === 'insert')).toBe(true));
    const inserted = d.log.find((l) => l.table === 'campaigns' && l.op === 'insert')!.values!;
    expect(inserted).toMatchObject({ name: 'Winter Immunity', description: 'Defence tips', status: 'draft', user_id: 'u-self', target_channels: { email: true } });
    expect((inserted.distribution_config as any).template_id).toBe('launch');
  });

  it('create: the name is required before the sheet moves on', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Autumn Reset')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaigns-new'));
    await waitFor(() => expect(screen.getByTestId('campaign-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaign-next'));
    expect(screen.getByTestId('campaign-name')).toBeTruthy();
    expect(screen.queryByTestId('campaign-channel-email')).toBeNull();
  });

  it('edit: tapping a card opens the sheet filled with that campaign and saves an update', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Spring Wellness Launch')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaign-card-camp-1'));
    await waitFor(() => expect(screen.getByTestId('campaign-sheet')).toBeTruthy());
    expect(screen.getByTestId('campaign-name').props.value).toBe('Spring Wellness Launch');
    fireEvent.changeText(screen.getByTestId('campaign-name'), 'Spring Wellness Relaunch');
    for (let i = 0; i < 3; i += 1) fireEvent.press(screen.getByTestId('campaign-next'));
    await act(async () => fireEvent.press(screen.getByTestId('campaign-save')));
    await waitFor(() => expect(d.tables.campaigns.find((c) => c.id === 'camp-1')?.name).toBe('Spring Wellness Relaunch'));
  });

  it('open: the open button navigates to the detail route', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Autumn Reset')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaign-open-camp-2'));
    expect(router.navigate).toHaveBeenCalledWith('/sharing/campaigns/camp-2');
  });

  it('duplicate and delete: write a draft copy and remove the row after confirmation', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Autumn Reset')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('campaign-duplicate-camp-2')));
    await waitFor(() => expect(d.tables.campaigns.some((c) => c.name === 'Autumn Reset (Copy)' && c.status === 'draft')).toBe(true));
    fireEvent.press(screen.getByTestId('campaign-delete-camp-2'));
    await act(async () => fireEvent.press(screen.getByTestId('campaign-delete-confirm')));
    await waitFor(() => expect(d.tables.campaigns.some((c) => c.id === 'camp-2')).toBe(false));
  });

  it('bulk: select all, duplicate the selection, and export it as CSV through the share sheet', async () => {
    const device = installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Autumn Reset')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaigns-bulk-toggle'));
    fireEvent.press(screen.getByTestId('campaign-select-camp-1'));
    await waitFor(() => expect(screen.getByTestId('bulk-toolbar')).toBeTruthy());
    fireEvent.press(screen.getByTestId('bulk-select-all'));
    await act(async () => fireEvent.press(screen.getByTestId('bulk-export')));
    expect(device.shared).toHaveLength(1);
    expect(device.shared[0].message).toContain('"Name","Status","Start Date","End Date","Description"');
    expect(device.shared[0].message).toContain('"Spring Wellness Launch"');
    await act(async () => fireEvent.press(screen.getByTestId('bulk-duplicate')));
    await waitFor(() => expect(d.tables.campaigns.filter((c) => /\(Copy\)$/.test(c.name))).toHaveLength(2));
  });

  it('bulk mode is offered only from two campaigns up', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: [campaignRow()], distribution_posts: [] } });
    render(<CampaignsScreen />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Spring Wellness Launch')).toBeTruthy());
    expect(screen.queryByTestId('campaigns-bulk-toggle')).toBeNull();
  });
});

describe('CampaignDetailScreen', () => {
  const posts = [
    postRow(),
    postRow({ id: 'post-2', title: 'Launch day', status: 'published', published_at: '2026-03-01T09:00:00Z' }),
    postRow({ id: 'post-3', title: 'Week two', status: 'scheduled', scheduled_for: '2026-03-08T09:00:00Z' }),
  ];

  it('loaded: shows the campaign, its four counters and its posts', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: posts } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getAllByText('Spring Wellness Launch').length).toBeGreaterThan(0));
    expect(screen.getByTestId('stat-total').props.children).toBe(3);
    expect(screen.getByTestId('stat-published').props.children).toBe(1);
    expect(screen.getByTestId('stat-scheduled').props.children).toBe(1);
    expect(screen.getByTestId('stat-drafts').props.children).toBe(1);
    expect(screen.getByTestId('post-row-post-2')).toBeTruthy();
  });

  it('not found: an unknown id shows the not-found state with a way back', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignDetailScreen id="nope" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('campaign-not-found')).toBeTruthy());
    fireEvent.press(screen.getByTestId('campaign-back-list'));
    expect(router.navigate).toHaveBeenCalledWith('/sharing/campaigns');
  });

  it('error: a failed load shows the error state', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two }, failTables: ['campaigns'] });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('campaign-detail-error')).toBeTruthy());
  });

  it('activate: a draft with channels is activated now — drafts are published, distribute-post runs, status becomes active', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: posts } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('detail-activate')).toBeTruthy());
    fireEvent.press(screen.getByTestId('detail-activate'));
    await waitFor(() => expect(screen.getByTestId('activate-sheet')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('activate-confirm')));
    await waitFor(() => expect(d.tables.campaigns.find((c) => c.id === 'camp-1')?.status).toBe('active'));
    expect(d.tables.distribution_posts.find((p) => p.id === 'post-1')?.status).toBe('published');
    expect(d.fnCalls).toEqual([{ name: 'distribute-post', body: { postId: 'post-1' } }]);
  });

  it('activate is disabled while the campaign has no channel', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: [campaignRow({ target_channels: {} })], distribution_posts: [] } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('detail-activate')).toBeTruthy());
    expect(screen.getByTestId('detail-activate').props.accessibilityState?.disabled).toBe(true);
  });

  it('scheduled activation: sets status scheduled with the chosen start date', async () => {
    const device = installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('detail-activate')).toBeTruthy());
    fireEvent.press(screen.getByTestId('detail-activate'));
    await waitFor(() => expect(screen.getByTestId('activate-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('activate-mode-scheduled'));
    fireEvent.press(screen.getByTestId('activate-date'));
    await act(async () => fireEvent.press(screen.getByTestId('activate-confirm')));
    await waitFor(() => expect(d.tables.campaigns.find((c) => c.id === 'camp-1')?.status).toBe('scheduled'));
    expect(d.tables.campaigns.find((c) => c.id === 'camp-1')?.start_date).toBe(device.fixedDate.toISOString());
  });

  it('pause, resume and complete follow the status', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: [campaignRow({ status: 'active' })], distribution_posts: [] } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('detail-pause')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('detail-pause')));
    await waitFor(() => expect(d.tables.campaigns[0].status).toBe('paused'));
    await waitFor(() => expect(screen.getByTestId('detail-resume')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('detail-resume')));
    await waitFor(() => expect(d.tables.campaigns[0].status).toBe('active'));
    await waitFor(() => expect(screen.getByTestId('detail-complete')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('detail-complete')));
    await waitFor(() => expect(d.tables.campaigns[0].status).toBe('completed'));
  });

  it('publish now and schedule a draft post', async () => {
    installFakeDevice();
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [postRow(), postRow({ id: 'post-9', title: 'Second draft' })] } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('post-publish-post-1')).toBeTruthy());
    await act(async () => fireEvent.press(screen.getByTestId('post-publish-post-1')));
    await waitFor(() => expect(d.tables.distribution_posts.find((p) => p.id === 'post-1')?.status).toBe('published'));
    fireEvent.press(screen.getByTestId('post-schedule-post-9'));
    await waitFor(() => expect(screen.getByTestId('schedule-sheet')).toBeTruthy());
    fireEvent.press(screen.getByTestId('schedule-date'));
    await act(async () => fireEvent.press(screen.getByTestId('schedule-confirm')));
    await waitFor(() => expect(d.tables.distribution_posts.find((p) => p.id === 'post-9')?.status).toBe('scheduled'));
  });

  it('create post: saves a draft attached to the campaign', async () => {
    const d = createSharingSupabaseDouble({ tables: { campaigns: two, distribution_posts: [] } });
    render(<CampaignDetailScreen id="camp-1" />, { wrapper: makeSharingWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('detail-create-post')).toBeTruthy());
    fireEvent.press(screen.getByTestId('detail-create-post'));
    await waitFor(() => expect(screen.getByTestId('create-post-sheet')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('post-title'), 'Hello');
    fireEvent.changeText(screen.getByTestId('post-description'), 'World');
    // The campaign's channels (email, whatsapp) are pre-selected, as on the web.
    fireEvent.press(screen.getByTestId('post-channel-whatsapp'));
    await act(async () => fireEvent.press(screen.getByTestId('post-save-draft')));
    await waitFor(() => expect(d.tables.distribution_posts).toHaveLength(1));
    expect(d.tables.distribution_posts[0]).toMatchObject({ title: 'Hello', description: 'World', campaign_id: 'camp-1', status: 'draft', channels: ['email'] });
  });
});
