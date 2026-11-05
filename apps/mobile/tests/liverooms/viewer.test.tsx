/**
 * VTID-05532 — native live-room viewer (`/comm/live-rooms/:roomId/view`): host detection from
 * `live_rooms.host_user_id`, room-state mapping from the gateway state endpoint, the enter
 * (token fetch) error copy, the video-engine gate, and the host-presence and exit signals.
 * The video surface is a fake registered through the port; no real Daily.co join runs here.
 */
import '../helpers/no-network';
import './mocks';
import type { ReactElement } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { registerLiveRoomVideoEngine, type LiveRoomVideoProps } from '../../src/ports/live-room-video';
import { createLiveRoomsSupabaseDouble, fakeGateway, makeLiveRoomsWrapper } from './helpers';
import { LiveRoomViewerScreen } from '../../src/screens/liverooms/LiveRoomViewerScreen';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
  registerLiveRoomVideoEngine(null);
});
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const ROOM = 'room-live-1';

/** A stand-in for the video surface. It never joins anything; it only exposes the port's callbacks. */
function FakeSurface({ roomUrl, onJoined, onLeft }: LiveRoomVideoProps): ReactElement {
  return (
    <View testID="live-room-surface" accessibilityLabel={roomUrl}>
      <Pressable testID="fake-joined" onPress={() => onJoined?.()}>
        <Text>joined</Text>
      </Pressable>
      <Pressable testID="fake-left" onPress={() => onLeft?.()}>
        <Text>left</Text>
      </Pressable>
    </View>
  );
}

function liveState(overrides: { in_room?: number; status?: string } = {}) {
  return {
    ok: true,
    room: { id: ROOM, status: overrides.status ?? 'live', room_name: null, room_slug: null, host_user_id: 'u-host', current_session_id: 's-1' },
    session: {
      id: 's-1',
      status: 'live',
      session_title: 'Morning Breath Circle',
      starts_at: '2026-01-10T08:00:00Z',
      ends_at: null,
      lobby_open_at: null,
      host_present: false,
      access_level: 'public',
      auto_admit: true,
      max_participants: 100,
    },
    counts: { lobby_waiting: 0, in_room: overrides.in_room ?? 7 },
    viewer: { role: 'guest', lobby_status: null, is_banned: false, has_access_grant: true },
  };
}

const enterOk = { ok: true, daily_room_url: 'https://rooms.example.invalid/morning', token: 'meeting-token', is_host: false, counts: { in_room: 7 } };

function gatewayFor(state: unknown, enter: { status: number; body?: unknown } = { status: 200, body: enterOk }) {
  return fakeGateway((path, method) => {
    if (path === `/live/rooms/${ROOM}/state`) return { status: 200, body: state };
    if (path === `/live/rooms/${ROOM}/enter`) return enter;
    if (path === `/live/rooms/${ROOM}/exit` || path === `/live/rooms/${ROOM}/host-present` || path === `/live/rooms/${ROOM}/host-absent`) return { status: 200, body: { ok: true } };
    if (path === `/live/rooms/${ROOM}/end` && method === 'POST') return { status: 200, body: { ok: true } };
    return undefined;
  });
}

function dbRooms(hostUserId: string) {
  return createLiveRoomsSupabaseDouble({
    userId: 'u-self',
    tables: { live_rooms: [{ id: ROOM, host_user_id: hostUserId, metadata: {} }], stream_recordings: [] },
  });
}

describe('LiveRoomViewerScreen host detection and room state', () => {
  it('host detection: the host gets the start action and a guest gets the join action', async () => {
    const hostCase = dbRooms('u-self');
    const hostGw = gatewayFor(liveState({ status: 'scheduled' }));
    const { unmount } = render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: hostCase.client, gateway: hostGw }) });
    await waitFor(() => expect(screen.getByText(en('screens.liveRoom.startStream'))).toBeTruthy());
    unmount();

    const guestCase = dbRooms('u-host');
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: guestCase.client, gateway: gatewayFor(liveState({ status: 'scheduled' })) }) });
    await waitFor(() => expect(screen.getByText(en('screens.liveRoom.joinStream'))).toBeTruthy());
  });

  it('room state mapping: a live room shows the live badge and the in-room count', async () => {
    const d = dbRooms('u-host');
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: d.client, gateway: gatewayFor(liveState({ in_room: 7 })) }) });
    await waitFor(() => expect(screen.getByTestId('live-room-viewer-count')).toBeTruthy());
    expect(screen.getByText(en('screens.liveRoom.inRoomCount', { count: 7 }))).toBeTruthy();
    expect(screen.getByTestId('live-room-live-badge')).toBeTruthy();
  });

  it('room state mapping: an ended room shows the ended panel', async () => {
    const d = dbRooms('u-host');
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: d.client, gateway: gatewayFor(liveState({ status: 'ended' })) }) });
    await waitFor(() => expect(screen.getByTestId('live-room-ended')).toBeTruthy());
    expect(screen.getByText(en('screens.community.thisRoomHasEnded'))).toBeTruthy();
  });
});

describe('LiveRoomViewerScreen enter, video gate and signals', () => {
  it('token fetch error: a refused enter shows the matching copy and offers a retry', async () => {
    registerLiveRoomVideoEngine({ Surface: FakeSurface });
    const d = dbRooms('u-host');
    const gw = gatewayFor(liveState(), { status: 409, body: { error: 'NOT_LIVE' } });
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: d.client, gateway: gw }) });
    await waitFor(() => expect(screen.getByTestId('live-room-enter')).toBeTruthy());
    fireEvent.press(screen.getByTestId('live-room-enter'));
    await waitFor(() => expect(screen.getByTestId('live-room-error')).toBeTruthy());
    expect(screen.getByText(en('screens.liveRoom.notLiveTitle'))).toBeTruthy();
    expect(screen.getByText(en('screens.community.retry'))).toBeTruthy();
  });

  it('video gate: without a video engine enter is disabled and the gateway is never asked to enter', async () => {
    registerLiveRoomVideoEngine(null);
    const d = dbRooms('u-host');
    const gw = gatewayFor(liveState());
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: d.client, gateway: gw }) });
    await waitFor(() => expect(screen.getByTestId('live-room-unavailable')).toBeTruthy());
    fireEvent.press(screen.getByTestId('live-room-enter'));
    expect(gw.calls.some((c) => c.path.endsWith('/enter'))).toBe(false);
  });

  it('the host joining the surface signals host presence, and leaving records the exit', async () => {
    registerLiveRoomVideoEngine({ Surface: FakeSurface });
    const d = dbRooms('u-self');
    const gw = gatewayFor(liveState(), { status: 200, body: { ...enterOk, is_host: true } });
    render(<LiveRoomViewerScreen roomId={ROOM} />, { wrapper: makeLiveRoomsWrapper({ client: d.client, gateway: gw }) });
    await waitFor(() => expect(screen.getByTestId('live-room-enter')).toBeTruthy());
    fireEvent.press(screen.getByTestId('live-room-enter'));
    await waitFor(() => expect(screen.getByTestId('live-room-surface')).toBeTruthy());
    expect(screen.getByTestId('live-room-surface').props.accessibilityLabel).toBe(enterOk.daily_room_url);

    fireEvent.press(screen.getByTestId('fake-joined'));
    await waitFor(() => expect(gw.calls.some((c) => c.path === `/live/rooms/${ROOM}/host-present`)).toBe(true));

    fireEvent.press(screen.getByTestId('fake-left'));
    await waitFor(() => expect(gw.calls.some((c) => c.path === `/live/rooms/${ROOM}/exit`)).toBe(true));
  });
});
