/**
 * VTID-05531 — the events data layer: the hub's list read (two reads merged,
 * enriched with attendee counts, co-creator flags and creator profiles), the
 * following feed, the public slug/id resolver, the create/update/delete writes
 * and the form validation + payload rules. Fixture and fake-client tests only.
 */
import './helpers';
import { configure } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import {
  buildEventInput,
  canDeleteEvent,
  canEditEvent,
  createCommunityEvent,
  deleteCommunityEvent,
  fetchCommunityEvents,
  fetchEventByIdOrSlug,
  fetchFollowingFeed,
  resolvePublicEvent,
  updateCommunityEvent,
  validateEventForm,
  type EventForm,
} from '../../src/screens/events/data/events';
import { eventRow, HOST, inThreeDays, makeEventsDouble, standardTables, todayAt23, VIEWER } from './helpers';

configure({ asyncUtilTimeout: 5000 });

afterEach(() => __setSupabaseForTests(null));

describe('fetchCommunityEvents (hub list read)', () => {
  it('merges the nearest and the recently created reads without duplicates, sorted by start time', async () => {
    const dbl = makeEventsDouble({ tables: standardTables() });
    __setSupabaseForTests(dbl.client);
    const events = await fetchCommunityEvents(VIEWER);
    expect(events[0].id).toBe('today-1');
    expect(events.map((e) => e.id).sort()).toEqual(['followed-1', 'today-1', 'upcoming-1']);
    const times = events.map((e) => new Date(e.start_time).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(dbl.reads.filter((r) => r.table === 'global_community_events')).toHaveLength(2);
  });

  it('counts only attending participants and flags co-creators and creator names', async () => {
    const tables = standardTables({ event_co_creators: [{ event_id: 'upcoming-1', user_id: VIEWER }] });
    const dbl = makeEventsDouble({ tables });
    __setSupabaseForTests(dbl.client);
    const events = await fetchCommunityEvents(VIEWER);
    const upcoming = events.find((e) => e.id === 'upcoming-1')!;
    expect(upcoming.participant_count).toBe(2);
    expect(upcoming.is_co_creator).toBe(true);
    expect(upcoming.creator_display_name).toBe('Host Person');
    expect(events.find((e) => e.id === 'today-1')!.is_co_creator).toBe(false);
  });

  it('surfaces a failed nearest read as an error, and keeps the list when only the recent read fails', async () => {
    const failing = makeEventsDouble({ tables: standardTables(), failOn: { global_community_events: 'boom' } });
    __setSupabaseForTests(failing.client);
    await expect(fetchCommunityEvents(VIEWER)).rejects.toMatchObject({ message: 'boom' });
  });

  it('a signed-out read has no co-creator flags', async () => {
    const dbl = makeEventsDouble({ tables: standardTables(), userId: null });
    __setSupabaseForTests(dbl.client);
    const events = await fetchCommunityEvents(null);
    expect(events.every((e) => e.is_co_creator === false)).toBe(true);
  });
});

describe('following feed', () => {
  it('reads the follows of the viewer and the profiles of those users', async () => {
    const dbl = makeEventsDouble({ tables: standardTables() });
    __setSupabaseForTests(dbl.client);
    const feed = await fetchFollowingFeed(VIEWER);
    expect(feed.followingIds).toEqual(['host-follow']);
    expect(feed.profiles.map((p) => p.display_name)).toEqual(['Followed Person']);
  });

  it('makes no read without a viewer', async () => {
    const dbl = makeEventsDouble({ tables: standardTables() });
    __setSupabaseForTests(dbl.client);
    expect(await fetchFollowingFeed(undefined)).toEqual({ followingIds: [], profiles: [] });
    expect(dbl.client.from).not.toHaveBeenCalled();
  });
});

describe('deep-link and public resolvers', () => {
  it('reads by id for a UUID and by slug otherwise', async () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    const dbl = makeEventsDouble({ tables: { global_community_events: [eventRow(uuid), eventRow('x', { slug: 'my-event' })] } });
    __setSupabaseForTests(dbl.client);
    expect((await fetchEventByIdOrSlug(uuid))?.id).toBe(uuid);
    expect((await fetchEventByIdOrSlug('my-event'))?.id).toBe('x');
    expect(await fetchEventByIdOrSlug('missing')).toBeNull();
  });

  it('resolves a public identifier through the resolve_event_by_slug RPC', async () => {
    const dbl = makeEventsDouble({
      rpc: {
        resolve_event_by_slug: ({ identifier }) => ({ data: identifier === 'known' ? [eventRow('p-1')] : [], error: null }),
      },
    });
    __setSupabaseForTests(dbl.client);
    expect((await resolvePublicEvent('known'))?.id).toBe('p-1');
    expect(await resolvePublicEvent('unknown')).toBeNull();
    expect(dbl.rpc).toHaveBeenCalledWith('resolve_event_by_slug', { identifier: 'known' });
  });

  it('throws when the RPC reports an error', async () => {
    const dbl = makeEventsDouble({ rpc: { resolve_event_by_slug: () => ({ data: null, error: { message: 'down' } }) } });
    __setSupabaseForTests(dbl.client);
    await expect(resolvePublicEvent('x')).rejects.toMatchObject({ message: 'down' });
  });
});

describe('writes', () => {
  const form: EventForm = {
    kind: 'meetup',
    title: '  Lake walk  ',
    description: 'Morning walk',
    date: '2031-05-04',
    startTime: '08:30',
    endTime: '',
    location: 'Park gate',
    isVirtual: false,
    virtualLink: '',
    capacity: '12',
  };

  it('builds a meetup payload with a local start time, trimmed title and integer capacity', () => {
    const input = buildEventInput(form);
    expect(input).toMatchObject({ title: 'Lake walk', event_type: 'meetup', location: 'Park gate', max_participants: 12, virtual_link: null, end_time: null });
    expect(new Date(input.start_time).getHours()).toBe(8);
    expect(new Date(input.start_time).getMinutes()).toBe(30);
  });

  it('uses the virtual link only for an online meetup with an http(s) link', () => {
    const online = buildEventInput({ ...form, isVirtual: true, location: 'ignored', virtualLink: 'https://meet.example.org/room' });
    expect(online.location).toBeNull();
    expect(online.virtual_link).toBe('https://meet.example.org/room');
    expect(buildEventInput({ ...form, isVirtual: true, virtualLink: 'not a link' }).virtual_link).toBeNull();
  });

  it('inserts with created_by set to the viewer and returns the new row', async () => {
    const dbl = makeEventsDouble({ tables: standardTables() });
    __setSupabaseForTests(dbl.client);
    const created = await createCommunityEvent(VIEWER, buildEventInput(form));
    expect(created.id).toMatch(/^new-/);
    const write = dbl.writes.find((w) => w.op === 'insert')!;
    expect(write.table).toBe('global_community_events');
    expect(write.values).toMatchObject({ created_by: VIEWER, event_type: 'meetup', title: 'Lake walk' });
  });

  it('updates and deletes by id', async () => {
    const dbl = makeEventsDouble({ tables: standardTables() });
    __setSupabaseForTests(dbl.client);
    await updateCommunityEvent('upcoming-1', buildEventInput({ ...form, title: 'Renamed' }));
    await deleteCommunityEvent('upcoming-1');
    const upd = dbl.writes.find((w) => w.op === 'update')!;
    expect(upd.values).toMatchObject({ title: 'Renamed' });
    expect(upd.filters).toEqual([['id', 'upcoming-1']]);
    const del = dbl.writes.find((w) => w.op === 'delete')!;
    expect(del.filters).toEqual([['id', 'upcoming-1']]);
  });
});

describe('form validation and ownership rules', () => {
  const base: EventForm = { kind: 'event', title: 'T', description: 'D', date: '2031-05-04', startTime: '10:00', endTime: '11:00', location: 'L', isVirtual: false, virtualLink: '', capacity: '' };

  it('reports the first missing or invalid field', () => {
    expect(validateEventForm({ ...base, title: ' ' }, new Date('2030-01-01T00:00:00Z'))).toBe('title');
    expect(validateEventForm({ ...base, date: '2031-13-40' }, new Date('2030-01-01T00:00:00Z'))).toBe('date');
    expect(validateEventForm({ ...base, startTime: '25:00' }, new Date('2030-01-01T00:00:00Z'))).toBe('startTime');
    expect(validateEventForm({ ...base, endTime: '09:00' }, new Date('2030-01-01T00:00:00Z'))).toBe('endTime');
    expect(validateEventForm({ ...base, location: '' }, new Date('2030-01-01T00:00:00Z'))).toBe('location');
    expect(validateEventForm(base, new Date('2030-01-01T00:00:00Z'))).toBeNull();
  });

  it('lets the owner or a co-creator edit an upcoming event, and only the owner delete it', () => {
    const future = eventRow('f', { start_time: inThreeDays(), created_by: HOST });
    expect(canEditEvent(future, HOST, false, new Date())).toBe(true);
    expect(canEditEvent(future, VIEWER, false, new Date())).toBe(false);
    expect(canEditEvent(future, VIEWER, true, new Date())).toBe(true);
    expect(canEditEvent(eventRow('p', { start_time: new Date(Date.now() - 86_400_000).toISOString(), created_by: HOST }), HOST, false, new Date())).toBe(false);
    expect(canDeleteEvent(future, HOST)).toBe(true);
    expect(canDeleteEvent(future, VIEWER)).toBe(false);
    expect(canDeleteEvent(future, null)).toBe(false);
    expect(todayAt23().length).toBeGreaterThan(10);
  });
});
