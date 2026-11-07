/**
 * VTID-05530 — the calendar entry screen (twin of `vcal/EntryScreen.tsx`) and the
 * `/calendar/entry/:entryId` deep link: the deep link jumps to the entry's day and opens it, back
 * returns to `/calendar`; mark done, move, edit, remove and the source action go through the
 * gateway; an ended event answers "not active". Fixture and fake-gateway data only.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { makeFormatters } from '../../src/screens/calendar/format';
import { CalendarScreen } from '../../src/screens/calendar/CalendarScreen';
import { createSupabaseDouble, fakeGateway, makeWrapper, todayAt, windowItem } from './helpers';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  __clearToastsForTests();
  jest.clearAllMocks();
});
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const fmt = makeFormatters('en');
const WINDOW = '/api/v1/calendar/events/window';

function setup(items: unknown[], opts: { entryId?: string; tables?: Record<string, Record<string, unknown>[]>; handler?: (path: string, method: string) => { status: number; body?: unknown } | undefined } = {}) {
  const gateway = fakeGateway((path, method) => {
    const custom = opts.handler?.(path, method);
    if (custom) return custom;
    if (path === WINDOW) return { status: 200, body: { ok: true, data: items, timezone: 'UTC' } };
    if (path.startsWith('/api/v1/calendar/conflicts')) return { status: 200, body: { ok: true, conflicts: [] } };
    return { status: 200, body: { ok: true, data: {} } };
  });
  const { client } = createSupabaseDouble({ tables: opts.tables });
  const Wrapper = makeWrapper({ client, gateway });
  render(<CalendarScreen entryId={opts.entryId} />, { wrapper: Wrapper });
  return { gateway };
}

const open = async (id: string) => {
  fireEvent.press(await screen.findByTestId(`vcal-entry-${id}`));
  return screen.findByTestId('vcal-entry-screen');
};

describe('entry screen', () => {
  it('opens full-screen with the date, time range, location and the reminders the gateway will send', async () => {
    setup([windowItem({ reminders: [{ kind: 'before', minutes: 30 }, { kind: 'evening_before', hour: 20 }] }, { id: 'a', title: 'Dentist', location: 'Main St 5', description: 'Bring the card' })]);
    const screenEl = await open('a');
    const start = todayAt(10);
    expect(within(screenEl).getByText('Dentist')).toBeTruthy();
    expect(within(screenEl).getByText(new RegExp(fmt.fmtDate(start, { weekday: 'long', day: 'numeric', month: 'long' })))).toBeTruthy();
    expect(within(screenEl).getByText(new RegExp(`${fmt.fmtTime(start, { hour: '2-digit', minute: '2-digit' })} – ${fmt.fmtTime(todayAt(11), { hour: '2-digit', minute: '2-digit' })}`))).toBeTruthy();
    expect(within(screenEl).getByText(/Main St 5/)).toBeTruthy();
    expect(within(screenEl).getByText('Bring the card')).toBeTruthy();
    expect(within(screenEl).getByText(new RegExp(en('vcal.reminder.minutesBefore', { count: 30 })))).toBeTruthy();
    const eve = new Date();
    eve.setHours(20, 0, 0, 0);
    expect(within(screenEl).getByText(new RegExp(en('vcal.reminder.eveningBefore', { time: fmt.fmtTime(eve, { hour: '2-digit', minute: '2-digit' }) })))).toBeTruthy();
  });

  it('says "no reminder" when the gateway sends none, and closes with the close button', async () => {
    setup([windowItem({ reminders: [] }, { id: 'a', title: 'Dentist' })]);
    const el = await open('a');
    expect(within(el).getByText(en('vcal.entry.noReminders'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('vcal-entry-close'));
    await waitFor(() => expect(screen.queryByTestId('vcal-entry-screen')).toBeNull());
  });

  it('marks a one-off entry done through the gateway and toasts the Vitana Index gain', async () => {
    const { gateway } = setup([windowItem({}, { id: 'a', title: 'Dentist' })], {
      handler: (path, method) => (method === 'POST' && path === '/api/v1/calendar/events/a/complete' ? { status: 200, body: { ok: true, vitana_index: { per_pillar_delta: { mental: 0.4 } } } } : undefined),
    });
    await open('a');
    fireEvent.press(screen.getByTestId('vcal-complete'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events/a/complete')).toHaveLength(1));
    expect(gateway.called('POST', '/api/v1/calendar/events/a/complete')[0].body).toEqual({ completion_status: 'completed' });
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.doneToast']));
    await waitFor(() => expect(screen.queryByTestId('vcal-entry-screen')).toBeNull());
  });

  it('offers no "mark done" for a recurring occurrence or a done entry', async () => {
    setup([
      windowItem({ occurrence_index: 2 }, { id: 'r', title: 'Series', rrule: 'FREQ=DAILY' }),
      windowItem({}, { id: 'd', title: 'Finished', completion_status: 'completed', start_time: todayAt(7), end_time: todayAt(8) }),
    ]);
    await open('r');
    expect(screen.queryByTestId('vcal-complete')).toBeNull();
    fireEvent.press(screen.getByTestId('vcal-entry-close'));
    await waitFor(() => expect(screen.queryByTestId('vcal-entry-screen')).toBeNull());
    await open('d');
    expect(screen.queryByTestId('vcal-complete')).toBeNull();
    expect(screen.getByText(new RegExp(en('vcal.done')))).toBeTruthy();
  });

  it('edits the member\'s own manual entry (PATCH with the changed fields)', async () => {
    const { gateway } = setup([windowItem({}, { id: 'a', title: 'Dentist', source_type: 'manual' })]);
    await open('a');
    fireEvent.press(screen.getByTestId('vcal-edit'));
    fireEvent.changeText(await screen.findByTestId('vcal-edit-title'), 'Dentist check-up');
    fireEvent.press(screen.getByTestId('vcal-edit-save'));
    await waitFor(() => expect(gateway.called('PATCH', '/api/v1/calendar/events/a')).toHaveLength(1));
    const body = gateway.called('PATCH', '/api/v1/calendar/events/a')[0].body;
    expect(body.title).toBe('Dentist check-up');
    expect(Date.parse(body.start_time)).toBe(Date.parse(todayAt(10)));
    expect(body.location).toBeNull();
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.edit.saved']));
  });

  it('blocks saving an edit without a title', async () => {
    const { gateway } = setup([windowItem({}, { id: 'a', title: 'Dentist', source_type: 'manual' })]);
    await open('a');
    fireEvent.press(screen.getByTestId('vcal-edit'));
    fireEvent.changeText(await screen.findByTestId('vcal-edit-title'), '   ');
    expect(screen.getByText(en('vcal.edit.invalid'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('vcal-edit-save'));
    expect(gateway.called('PATCH', '/api/v1/calendar/events/a')).toHaveLength(0);
  });

  it('hides edit for an entry a source owns, and removes after a confirm', async () => {
    const { gateway } = setup([windowItem({}, { id: 'a', title: 'Plan step', source_type: 'assistant' })]);
    await open('a');
    expect(screen.queryByTestId('vcal-edit')).toBeNull();
    fireEvent.press(screen.getByTestId('vcal-remove'));
    expect(await screen.findByText(en('vcal.remove.confirm'))).toBeTruthy();
    expect(gateway.called('DELETE', '/api/v1/calendar/events/a')).toHaveLength(0);
    fireEvent.press(screen.getByTestId('vcal-remove-yes'));
    await waitFor(() => expect(gateway.called('DELETE', '/api/v1/calendar/events/a')).toHaveLength(1));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.remove.removed']));
  });

  it('moves a movable entry: the new start is posted and the length is kept by the gateway', async () => {
    const { gateway } = setup([windowItem({ movable: true }, { id: 'a', title: 'Dentist' })]);
    await open('a');
    fireEvent.press(screen.getByTestId('vcal-move'));
    expect(await screen.findByTestId('vcal-move-picker')).toBeTruthy();
    // Nothing changed yet: confirm is disabled.
    fireEvent.press(screen.getByTestId('vcal-move-confirm'));
    expect(gateway.called('POST', '/api/v1/calendar/events/a/move')).toHaveLength(0);
    fireEvent.press(screen.getByTestId('vcal-move-time-next'));
    fireEvent.press(screen.getByTestId('vcal-move-confirm'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events/a/move')).toHaveLength(1));
    expect(Date.parse(gateway.called('POST', '/api/v1/calendar/events/a/move')[0].body.start_time)).toBe(Date.parse(todayAt(10, 15)));
  });

  it('shows the gateway\'s reason when a move is refused', async () => {
    setup([windowItem({ movable: true }, { id: 'a', title: 'Dentist' })], {
      handler: (path, method) => (method === 'POST' && path.endsWith('/move') ? { status: 409, body: { ok: false, error: 'NOT_MOVABLE', reason: 'owned_by_source' } } : undefined),
    });
    await open('a');
    fireEvent.press(screen.getByTestId('vcal-move'));
    fireEvent.press(await screen.findByTestId('vcal-move-time-next'));
    fireEvent.press(screen.getByTestId('vcal-move-confirm'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.move.blocked.owned_by_source']));
  });

  it('a community event leads to its event page', async () => {
    setup([windowItem({}, { id: 'ev', title: 'Meetup', source_type: 'community_rsvp', source_ref_type: 'community_event', source_ref_id: 'evt-9', start_time: todayAt(23, 0), end_time: todayAt(23, 59) })]);
    await open('ev');
    fireEvent.press(screen.getByTestId('vcal-open-source'));
    expect(router.navigate).toHaveBeenCalledWith('/comm/events-meetups?event=evt-9');
  });

  it('an ended source entry shows the ended chip and notice', async () => {
    // 00:01–00:02 today: over for the whole day (the suite is not run in the first two minutes of a day).
    setup([windowItem({}, { id: 'old', title: 'Past meetup', source_type: 'live_room', source_ref_type: 'live_room_session', metadata: { live_room_id: 'r-1' }, start_time: todayAt(0, 1), end_time: todayAt(0, 2) })]);
    await open('old');
    expect(screen.getByTestId('vcal-ended-notice')).toHaveTextContent(en('vcal.entry.endedNotice'));
    fireEvent.press(screen.getByTestId('vcal-open-source'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.entry.endedToast']));
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('the daily audiobook entry opens the player instead of "mark done"', async () => {
    setup([windowItem({}, { id: 'ab', title: 'Audiobook', source_type: 'audiobook' })]);
    await open('ab');
    expect(screen.queryByTestId('vcal-complete')).toBeNull();
    fireEvent.press(screen.getByTestId('vcal-listen'));
    expect(router.navigate).toHaveBeenCalledWith('/autopilot/audiobook');
  });
});

describe('deep link /calendar/entry/:entryId', () => {
  it('jumps to the entry\'s day, opens it, and back returns to /calendar', async () => {
    const tomorrowStart = todayAt(9, 0, 1);
    const item = windowItem({}, { id: 'deep-1', title: 'Deep linked', start_time: tomorrowStart, end_time: todayAt(10, 0, 1) });
    const gateway = fakeGateway((path) => {
      if (path === WINDOW) return { status: 200, body: { ok: true, data: [item], timezone: 'UTC' } };
      if (path.startsWith('/api/v1/calendar/conflicts')) return { status: 200, body: { ok: true, conflicts: [] } };
      return undefined;
    });
    const { client } = createSupabaseDouble({ tables: { calendar_events: [{ id: 'deep-1', start_time: tomorrowStart }] } });
    render(<CalendarScreen entryId="deep-1" />, { wrapper: makeWrapper({ client, gateway }) });
    const el = await screen.findByTestId('vcal-entry-screen');
    expect(within(el).getByText('Deep linked')).toBeTruthy();
    // The window it loaded is tomorrow's.
    await waitFor(() => {
      const froms = gateway.called('GET', WINDOW).map((c) => new Date(c.query.get('from') as string).getDate());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(froms).toContain(tomorrow.getDate());
    });
    fireEvent.press(screen.getByTestId('vcal-entry-close'));
    expect(router.replace).toHaveBeenCalledWith('/calendar');
  });

  it('the system back gesture (the modal\'s request-close) also returns to /calendar', async () => {
    const start = todayAt(9);
    const gateway = fakeGateway((path) => (path === WINDOW ? { status: 200, body: { ok: true, data: [windowItem({}, { id: 'deep-2', title: 'Back test', start_time: start })] } } : undefined));
    const { client } = createSupabaseDouble({ tables: { calendar_events: [{ id: 'deep-2', start_time: start }] } });
    render(<CalendarScreen entryId="deep-2" />, { wrapper: makeWrapper({ client, gateway }) });
    const el = await screen.findByTestId('vcal-entry-screen');
    el.props.onRequestClose?.();
    expect(router.replace).toHaveBeenCalledWith('/calendar');
  });

  it('an entry the member cannot read leaves the calendar visible and shows a not-found note', async () => {
    const gateway = fakeGateway((path) => (path === WINDOW ? { status: 200, body: { ok: true, data: [] } } : undefined));
    const { client } = createSupabaseDouble({ tables: { calendar_events: [] } });
    render(<CalendarScreen entryId="nope" />, { wrapper: makeWrapper({ client, gateway }) });
    expect(await screen.findByTestId('vcal-entry-not-found')).toHaveTextContent(en('calendarNative.entry.notFound'));
    expect(screen.queryByTestId('vcal-entry-screen')).toBeNull();
  });
});
