/**
 * VTID-05532 — native live-rooms list (`/comm/live-rooms`, all / live / scheduled / past) and the
 * room drawer: loaded / empty / error per tab, tab and search filters, notify-me, drawer open and
 * dismiss, and the interested-people count. Fixture and fake-gateway data only; no Daily.co join.
 */
import '../helpers/no-network';
import './mocks';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { createLiveRoomsSupabaseDouble, inMinutes, makeLiveRoomsWrapper, streamRow } from './helpers';
import { LiveRoomsScreen } from '../../src/screens/liverooms/LiveRoomsScreen';

afterAll(() => __setSupabaseForTests(null));

/** Waits for the host profile to render, so the profile query settles inside the test. */
const settle = () => waitFor(() => expect(screen.getAllByText('Mara Host').length).toBeGreaterThan(0));
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

const liveRoom = streamRow({ id: 'room-live-1', title: 'Morning Breath Circle', created_by: 'u-host' });
const scheduledRoom = streamRow({
  id: 'room-sched-1',
  title: 'Evening Sound Bath',
  status: 'pending',
  started_at: null,
  scheduled_for: inMinutes(180),
  viewer_count: 0,
  created_by: 'u-host',
});
const endedRoom = streamRow({
  id: 'room-past-1',
  title: 'Breathwork Recap',
  status: 'ended',
  started_at: '2026-01-02T09:00:00Z',
  ended_at: '2026-01-02T10:00:00Z',
  created_by: 'u-host',
});
const profiles = [{ user_id: 'u-host', display_name: 'Mara Host', avatar_url: null }];

function populated() {
  return createLiveRoomsSupabaseDouble({
    tables: {
      community_live_streams: [liveRoom, scheduledRoom, endedRoom],
      profiles,
      stream_recordings: [],
      live_stream_subscribers: [],
    },
    rpc: {
      get_live_stream_subscriber_counts: () => [{ stream_id: 'room-sched-1', subscriber_count: 4 }],
      get_live_stream_subscribers: () => [{ user_id: 'u-ada', display_name: 'Ada Member', avatar_url: null, subscribed_at: '2026-01-09T10:00:00Z' }],
    },
  });
}

describe('LiveRoomsScreen tabs', () => {
  it('loaded: the all tab lists live and scheduled rooms together', async () => {
    const d = populated();
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('live-rooms-list')).toBeTruthy());
    await settle();
    expect(screen.getByText('Morning Breath Circle')).toBeTruthy();
    expect(screen.getByText('Evening Sound Bath')).toBeTruthy();
    expect(screen.queryByText('Breathwork Recap')).toBeNull();
  });

  it('tab filter: the live tab shows only live rooms and the scheduled tab only scheduled rooms', async () => {
    const d = populated();
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('live-rooms-list')).toBeTruthy());
    await settle();

    fireEvent.press(screen.getByTestId('live-rooms-tab-live'));
    await waitFor(() => expect(screen.queryByText('Evening Sound Bath')).toBeNull());
    expect(screen.getByText('Morning Breath Circle')).toBeTruthy();

    fireEvent.press(screen.getByTestId('live-rooms-tab-scheduled'));
    await waitFor(() => expect(screen.queryByText('Morning Breath Circle')).toBeNull());
    expect(screen.getByText('Evening Sound Bath')).toBeTruthy();
  });

  it('the tab named in the route opens that tab (the ?tab= search param)', async () => {
    const d = populated();
    render(<LiveRoomsScreen initialTab="past" />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByText('Breathwork Recap')).toBeTruthy());
    await settle();
    expect(screen.queryByText('Morning Breath Circle')).toBeNull();
  });

  it('empty: each tab shows its own empty copy', async () => {
    const d = createLiveRoomsSupabaseDouble({ tables: { community_live_streams: [], profiles: [], stream_recordings: [], live_stream_subscribers: [] } });
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('live-rooms-empty-all')).toBeTruthy());
    expect(screen.getByText(en('liveRooms.noRooms'))).toBeTruthy();

    fireEvent.press(screen.getByTestId('live-rooms-tab-scheduled'));
    await waitFor(() => expect(screen.getByText(en('screens.community.noScheduledRooms'))).toBeTruthy());

    fireEvent.press(screen.getByTestId('live-rooms-tab-past'));
    await waitFor(() => expect(screen.getByText(en('screens.liverooms.past.empty'))).toBeTruthy());
  });

  it('error: a failed load shows the error state instead of an empty list', async () => {
    const d = createLiveRoomsSupabaseDouble({ failTables: true });
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('live-rooms-error')).toBeTruthy());
  });

  it('search filters the live and scheduled rooms by text', async () => {
    const d = populated();
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('live-rooms-list')).toBeTruthy());
    await settle();
    fireEvent.changeText(screen.getByTestId('live-rooms-search'), 'sound');
    await waitFor(() => expect(screen.queryByText('Morning Breath Circle')).toBeNull());
    expect(screen.getByText('Evening Sound Bath')).toBeTruthy();
  });
});

describe('LiveRoomsScreen notify and drawer', () => {
  it('notify me on a scheduled room writes the subscription for the signed-in member', async () => {
    const d = populated();
    render(<LiveRoomsScreen initialTab="scheduled" />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('room-notify-room-sched-1')).toBeTruthy());
    await settle();
    fireEvent.press(screen.getByTestId('room-notify-room-sched-1'));
    await waitFor(() => expect(d.inserts).toEqual([{ table: 'live_stream_subscribers', values: { stream_id: 'room-sched-1', user_id: 'u-self' } }]));
  });

  it('opens the drawer on a card tap and dismisses it', async () => {
    const d = populated();
    render(<LiveRoomsScreen />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('room-card-room-live-1')).toBeTruthy());
    await settle();
    fireEvent.press(screen.getByTestId('room-card-room-live-1'));
    await waitFor(() => expect(screen.getByTestId('room-drawer')).toBeTruthy());
    // The title is on the card and again as the drawer heading.
    expect(screen.getAllByText('Morning Breath Circle').length).toBeGreaterThan(1);

    fireEvent.press(screen.getByTestId('room-drawer-close'));
    await waitFor(() => expect(screen.queryByTestId('room-drawer')).toBeNull());
  });

  it('the drawer of a scheduled room shows the interested-people count', async () => {
    const d = populated();
    render(<LiveRoomsScreen initialTab="scheduled" />, { wrapper: makeLiveRoomsWrapper({ client: d.client }) });
    await waitFor(() => expect(screen.getByTestId('room-card-room-sched-1')).toBeTruthy());
    await settle();
    fireEvent.press(screen.getByTestId('room-card-room-sched-1'));
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
    expect(screen.getByTestId('room-drawer-count').props.children).toBe(en('screens.liverooms.willJoinCount', { count: 4 }));
  });
});
