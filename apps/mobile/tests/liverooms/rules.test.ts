/** VTID-05532 — live-room rules, labels and gateway error codes (pure, fixture data, no network). */
import '../helpers/no-network';
import './mocks';
import { configure } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import {
  MAX_LIVE_STREAM_DURATION_MS,
  allRoomsInTimeOrder,
  filterRooms,
  isLiveStreamStale,
  isScheduledStreamDue,
  streamToRoom,
  type RoomView,
} from '../../src/screens/liverooms/data/rules';
import { formatRoomDuration, formatScheduledWhen } from '../../src/screens/liverooms/format';
import { enterErrorCode } from '../../src/screens/liverooms/data/gateway';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const t = (key: string, params?: Record<string, string | number>) => en(key, params);
const NOW = new Date(2026, 0, 10, 9, 0).getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const minutesFromNow = (m: number) => new Date(NOW + m * 60_000).toISOString();

describe('stream staleness and due rules', () => {
  it('a live room past its planned finish plus grace is stale', () => {
    const started = hoursAgo(5);
    expect(isLiveStreamStale({ status: 'live', started_at: started, scheduled_for: null, created_at: started, duration_minutes: 45 }, NOW)).toBe(true);
  });

  it('a live room inside its planned window is not stale', () => {
    const started = new Date(NOW - 5 * 60_000).toISOString();
    expect(isLiveStreamStale({ status: 'live', started_at: started, scheduled_for: null, created_at: started, duration_minutes: 45 }, NOW)).toBe(false);
  });

  it('a live room without any usable start time is treated as orphaned', () => {
    expect(isLiveStreamStale({ status: 'live', started_at: null, scheduled_for: null, created_at: 'not-a-date', duration_minutes: null }, NOW)).toBe(true);
  });

  it('a legacy live room without a duration falls back to the fixed cap', () => {
    const started = new Date(NOW - MAX_LIVE_STREAM_DURATION_MS + 60_000).toISOString();
    expect(isLiveStreamStale({ status: 'live', started_at: started, scheduled_for: null, created_at: started, duration_minutes: null }, NOW)).toBe(false);
  });

  it('a pending room is due once its start time has passed', () => {
    expect(isScheduledStreamDue({ status: 'pending', scheduled_for: minutesFromNow(-1) }, NOW)).toBe(true);
    expect(isScheduledStreamDue({ status: 'pending', scheduled_for: minutesFromNow(30) }, NOW)).toBe(false);
    expect(isScheduledStreamDue({ status: 'live', scheduled_for: minutesFromNow(-1) }, NOW)).toBe(false);
  });
});

describe('room mapping and list helpers', () => {
  const host = { name: 'Mara Host', avatar: null };

  it('maps a pending stream to a scheduled room with the host name and the interested count', () => {
    const room = streamToRoom(
      { id: 'r1', title: 'Evening', description: null, stream_type: 'video', tags: ['sleep'], access_level: 'public', cover_image_url: null, scheduled_for: minutesFromNow(-2), status: 'pending', duration_minutes: 60, created_by: 'u-host', viewer_count: 0, started_at: null, created_at: hoursAgo(3) } as never,
      host,
      { interestedCount: 4 },
      NOW,
    );
    expect(room).toMatchObject({ id: 'r1', isLive: false, startingSoon: true, interestedCount: 4, durationMinutes: 60, type: 'video' });
    expect(room.host).toEqual({ id: 'u-host', name: 'Mara Host', avatar: null });
  });

  it('orders undated live rooms first and scheduled rooms by start time', () => {
    const base = { description: undefined, host: { id: 'h', name: 'H', avatar: null }, tags: [], participants: 0, interestedCount: 0, isPremium: false, type: 'audio' as const, category: 'general', location: 'Virtual', status: 'live' as const };
    const live: RoomView = { ...base, id: 'live-a', title: 'Live now', isLive: true };
    const late: RoomView = { ...base, id: 'sched-late', title: 'Late', isLive: false, scheduledTime: minutesFromNow(120) };
    const early: RoomView = { ...base, id: 'sched-early', title: 'Early', isLive: false, scheduledTime: minutesFromNow(30) };
    expect(allRoomsInTimeOrder([live], [late, early]).map((r) => r.id)).toEqual(['live-a', 'sched-early', 'sched-late']);
  });

  it('filters by title, host name, tags and category without case sensitivity', () => {
    const base = { description: undefined, host: { id: 'h', name: 'Mara Host', avatar: null }, participants: 0, interestedCount: 0, isPremium: false, type: 'audio' as const, location: 'Virtual', status: 'live' as const, isLive: true };
    const rooms: RoomView[] = [
      { ...base, id: 'a', title: 'Breath Circle', tags: ['breathwork'], category: 'health' },
      { ...base, id: 'b', title: 'Sound Bath', tags: [], category: 'music', host: { id: 'h2', name: 'Lena', avatar: null } },
    ];
    expect(filterRooms(rooms, '  ').map((r) => r.id)).toEqual(['a', 'b']);
    expect(filterRooms(rooms, 'BREATH').map((r) => r.id)).toEqual(['a']);
    expect(filterRooms(rooms, 'mara').map((r) => r.id)).toEqual(['a']);
    expect(filterRooms(rooms, 'music').map((r) => r.id)).toEqual(['b']);
  });
});

describe('labels', () => {
  it('formats the planned length with the catalog phrases', () => {
    expect(formatRoomDuration(45, t)).toBe(en('screens.liverooms.durationMin', { value0: 45 }));
    expect(formatRoomDuration(90, t)).toBe(en('screens.liverooms.durationHourMin', { value0: 1, value1: 30 }));
    expect(formatRoomDuration(120, t)).toBe(en('screens.liverooms.durationHour', { value0: 2 }));
    expect(formatRoomDuration(0, t)).toBeNull();
    expect(formatRoomDuration(undefined, t)).toBeNull();
  });

  it('labels a scheduled room as today, tomorrow or a dated day with a 24-hour time', () => {
    const now = new Date(2026, 0, 10, 9, 0);
    const at = (day: number) => new Date(2026, 0, day, 20, 0);
    expect(formatScheduledWhen(at(10).toISOString(), 'en', t, now)).toBe(en('screens.liverooms.whenToday', { time: '20.00h' }));
    expect(formatScheduledWhen(at(11).toISOString(), 'en', t, now)).toBe(en('screens.liverooms.whenTomorrow', { time: '20.00h' }));
    const dated = formatScheduledWhen(at(25).toISOString(), 'en', t, now);
    expect(dated).toContain('20.00h');
    expect(dated).not.toBe(en('screens.liverooms.whenToday', { time: '20.00h' }));
  });
});

describe('gateway enter error codes', () => {
  it.each([
    [409, undefined, 'NOT_LIVE'],
    [400, 'NOT_LIVE', 'NOT_LIVE'],
    [402, undefined, 'PAYMENT_REQUIRED'],
    [401, undefined, 'UNAUTHENTICATED'],
    [403, undefined, 'FORBIDDEN'],
    [404, undefined, 'NOT_FOUND'],
    [500, undefined, 'UNKNOWN'],
  ])('status %i (%s) maps to %s', (status, error, code) => {
    expect(enterErrorCode(status, error)).toBe(code);
  });
});
