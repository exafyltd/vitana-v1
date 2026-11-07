/**
 * VTID-05530 — native reminders (`/reminders`) and the fire deep link (`/reminders/fire/:fireId`):
 * the three groups (suggested by Vitana, scheduled by you, recent), loaded / empty / error, the
 * filter views, mark done / delete (with confirm) / create (with validation), and the interrupt
 * overlay a fire link shows: Mark done (and the Autopilot slot route), Snooze 10 min, Dismiss.
 * Reminder times are checked against the locale-format output. Fixture and fake-gateway data only.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { makeFormatters } from '../../src/screens/calendar/format';
import { RemindersScreen } from '../../src/screens/calendar/RemindersScreen';
import { createSupabaseDouble, fakeGateway, makeWrapper, reminderRow, todayAt } from './helpers';

afterAll(() => __setSupabaseForTests(null));
afterEach(() => {
  __clearToastsForTests();
  jest.clearAllMocks();
});
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const fmt = makeFormatters('en');
const LIST = '/api/v1/reminders';

type Handler = (path: string, method: string) => { status: number; body?: unknown } | undefined;

function setup(list: unknown[] | 'error', props: { fireId?: string; filter?: string } = {}, extra?: Handler) {
  const gateway = fakeGateway((path, method) => {
    const custom = extra?.(path, method);
    if (custom) return custom;
    if (path === LIST && method === 'GET') return list === 'error' ? { status: 500, body: { ok: false } } : { status: 200, body: { ok: true, data: list } };
    return { status: 200, body: { ok: true, data: {} } };
  });
  const { client } = createSupabaseDouble();
  render(<RemindersScreen {...props} />, { wrapper: makeWrapper({ client, gateway }) });
  return { gateway };
}

describe('reminders list', () => {
  it('groups reminders into suggested by Vitana, scheduled by you and recent', async () => {
    setup([
      reminderRow({ id: 's1', action_text: 'Drink water', created_via: 'system' }),
      reminderRow({ id: 'u1', action_text: 'Take magnesium', created_via: 'voice', next_fire_at: todayAt(20) }),
      reminderRow({ id: 'r1', action_text: 'Old stretch', status: 'completed', next_fire_at: todayAt(7) }),
    ]);
    expect(await screen.findByText('Drink water')).toBeTruthy();
    expect(within(screen.getByTestId('reminders-group-suggested')).getByText('Drink water')).toBeTruthy();
    expect(within(screen.getByTestId('reminders-group-scheduled')).getByText('Take magnesium')).toBeTruthy();
    expect(within(screen.getByTestId('reminders-group-recent')).getByText('Old stretch')).toBeTruthy();
    expect(screen.getByText(en('screens.reminders.suggestedByVitana'))).toBeTruthy();
    expect(screen.getByText(en('screens.reminders.scheduledByYou'))).toBeTruthy();
  });

  it('formats each fire time with the locale-format date-time (weekday, month, day, time)', async () => {
    setup([reminderRow({ id: 'u1', action_text: 'Take magnesium', next_fire_at: todayAt(20, 5) })]);
    await screen.findByText('Take magnesium');
    const expected = fmt.fmtDateTime(new Date(todayAt(20, 5)), { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    expect(screen.getByTestId('reminder-time-u1')).toHaveTextContent(expected);
  });

  it('shows the Vitana badge on suggested reminders, notes, and the empty copy of each group', async () => {
    setup([reminderRow({ id: 's1', action_text: 'Drink water', created_via: 'system', description: 'Stay hydrated' })]);
    await screen.findByText('Drink water');
    expect(screen.getByText('Stay hydrated')).toBeTruthy();
    expect(screen.getByText(en('screens.reminders.vitana'))).toBeTruthy();
    expect(within(screen.getByTestId('reminders-group-scheduled')).getByText(new RegExp(en('screens.reminders.tapOrbSay')))).toBeTruthy();
    expect(screen.queryByTestId('reminders-group-recent')).toBeNull();
  });

  it('shows the empty suggested group when there are no reminders at all', async () => {
    setup([]);
    expect(await screen.findByText(en('screens.reminders.vitanaHasnTSuggestedAnyReminders'))).toBeTruthy();
  });

  it('shows a loading state, then an error state with retry', async () => {
    const { gateway } = setup('error');
    expect(await screen.findByTestId('reminders-error')).toBeTruthy();
    expect(screen.getByText(en('errors.somethingWentWrong'))).toBeTruthy();
    fireEvent.press(screen.getByTestId('reminders-retry'));
    await waitFor(() => expect(gateway.called('GET', LIST).length).toBeGreaterThanOrEqual(2));
  });

  it('asks the gateway for fired reminders too (include_fired, limit 100)', async () => {
    const { gateway } = setup([]);
    await screen.findByTestId('reminders-screen');
    await waitFor(() => expect(gateway.called('GET', LIST)).toHaveLength(1));
    expect(gateway.called('GET', LIST)[0].query.get('include_fired')).toBe('1');
    expect(gateway.called('GET', LIST)[0].query.get('limit')).toBe('100');
  });

  it('the filter view shows one list with its own empty copy and "show all" returns', async () => {
    setup([reminderRow({ id: 'm1', action_text: 'Missed one', status: 'fired' })], { filter: 'missed' });
    expect(await screen.findByText('Missed one')).toBeTruthy();
    expect(screen.getByText(en('screens.reminders.filterMissed'))).toBeTruthy();
    expect(screen.queryByTestId('reminders-group-suggested')).toBeNull();
    fireEvent.press(screen.getByTestId('reminders-show-all'));
    expect(await screen.findByTestId('reminders-group-suggested')).toBeTruthy();
  });

  it('the completed filter shows its empty copy', async () => {
    setup([], { filter: 'completed' });
    expect(await screen.findByText(en('screens.reminders.noCompleted'))).toBeTruthy();
  });
});

describe('reminders actions', () => {
  it('marks a pending reminder done through the gateway', async () => {
    const { gateway } = setup([reminderRow({ id: 'u1', action_text: 'Take magnesium' })]);
    fireEvent.press(await screen.findByTestId('reminder-done-u1'));
    await waitFor(() => expect(gateway.called('POST', `${LIST}/u1/complete`)).toHaveLength(1));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['toasts.reminders.markedDone']));
  });

  it('has no done button on a reminder that is already completed', async () => {
    setup([reminderRow({ id: 'r1', action_text: 'Old', status: 'completed' })]);
    await screen.findByText('Old');
    expect(screen.queryByTestId('reminder-done-r1')).toBeNull();
    expect(screen.getByTestId('reminder-delete-r1')).toBeTruthy();
  });

  it('deletes only after the confirm, naming the reminder', async () => {
    const { gateway } = setup([reminderRow({ id: 'u1', action_text: 'Take magnesium' })]);
    fireEvent.press(await screen.findByTestId('reminder-delete-u1'));
    const confirm = await screen.findByTestId('reminder-delete-confirm');
    expect(within(confirm).getByText('Take magnesium')).toBeTruthy();
    expect(gateway.called('DELETE', `${LIST}/u1`)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('reminder-delete-yes'));
    await waitFor(() => expect(gateway.called('DELETE', `${LIST}/u1`)).toHaveLength(1));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['toasts.reminders.reminderDeleted']));
  });

  it('cancelling the confirm deletes nothing', async () => {
    const { gateway } = setup([reminderRow({ id: 'u1', action_text: 'Take magnesium' })]);
    fireEvent.press(await screen.findByTestId('reminder-delete-u1'));
    fireEvent.press(await screen.findByTestId('reminder-delete-no'));
    await waitFor(() => expect(screen.queryByTestId('reminder-delete-confirm')).toBeNull());
    expect(gateway.called('DELETE', `${LIST}/u1`)).toHaveLength(0);
  });

  it('delete-all appears from two upcoming reminders and deletes after the confirm', async () => {
    const { gateway } = setup(
      [reminderRow({ id: 'a', action_text: 'One' }), reminderRow({ id: 'b', action_text: 'Two', next_fire_at: todayAt(21) })],
      {},
      (path, method) => (path === LIST && method === 'DELETE' ? { status: 200, body: { ok: true, deleted: 2 } } : undefined),
    );
    fireEvent.press(await screen.findByTestId('reminders-delete-all'));
    expect(await screen.findByText(en('screens.reminders.deleteAllLengthReminders', { length: 2 }), { exact: false })).toBeTruthy();
    fireEvent.press(screen.getByTestId('reminders-delete-all-yes'));
    await waitFor(() => expect(gateway.called('DELETE', LIST)).toHaveLength(1));
    expect(gateway.called('DELETE', LIST)[0].query.get('mode')).toBe('all');
  });

  it('creates a reminder: validates the text, then posts the text, ISO time, spoken message and notes', async () => {
    const { gateway } = setup([]);
    fireEvent.press(await screen.findByTestId('reminders-add'));
    await screen.findByTestId('reminder-form');
    fireEvent.press(screen.getByTestId('reminder-form-submit'));
    expect(gateway.called('POST', LIST)).toHaveLength(0);
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['toasts.reminders.pleaseEnterWhatRemindYouAbout']));

    fireEvent.changeText(screen.getByTestId('reminder-form-action'), '  Call Anna  ');
    fireEvent.press(screen.getByTestId('reminder-form-when-next'));
    fireEvent.changeText(screen.getByTestId('reminder-form-notes'), 'about the trip');
    fireEvent.press(screen.getByTestId('reminder-form-submit'));
    await waitFor(() => expect(gateway.called('POST', LIST)).toHaveLength(1));
    const body = gateway.called('POST', LIST)[0].body;
    expect(body.action_text).toBe('Call Anna');
    expect(body.spoken_message).toBe('Time to call anna');
    expect(body.description).toBe('about the trip');
    expect(Number.isNaN(Date.parse(body.scheduled_for_iso))).toBe(false);
    expect(Date.parse(body.scheduled_for_iso)).toBeGreaterThan(Date.now());
    expect(typeof body.user_tz).toBe('string');
    await waitFor(() => expect(screen.queryByTestId('reminder-form')).toBeNull());
  });

  it('shows the failed-to-create toast when the gateway refuses', async () => {
    setup([], {}, (path, method) => (path === LIST && method === 'POST' ? { status: 500, body: { ok: false } } : undefined));
    fireEvent.press(await screen.findByTestId('reminders-add'));
    fireEvent.changeText(await screen.findByTestId('reminder-form-action'), 'Call Anna');
    fireEvent.press(screen.getByTestId('reminder-form-submit'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['toasts.reminders.failedToCreate']));
  });
});

describe('fire deep link /reminders/fire/:fireId', () => {
  const fire = (over = {}) => reminderRow({ id: 'f1', action_text: 'Take magnesium', spoken_message: 'Time for your magnesium', description: 'With water', status: 'fired', fired_at: todayAt(20), ...over });
  const withFire = (extra?: Handler): Handler => (path, method) => {
    if (path === `${LIST}/f1` && method === 'GET') return { status: 200, body: { ok: true, data: fire() } };
    return extra?.(path, method);
  };

  it('renders the reminders list and the interrupt overlay with text, spoken message and notes', async () => {
    const { gateway } = setup([fire()], { fireId: 'f1' }, withFire());
    const overlay = await screen.findByTestId('reminder-fire-overlay');
    expect(gateway.called('GET', `${LIST}/f1`)).toHaveLength(1);
    expect(within(overlay).getByText('Take magnesium')).toBeTruthy();
    expect(within(overlay).getByText('Time for your magnesium')).toBeTruthy();
    expect(within(overlay).getByText('With water')).toBeTruthy();
    expect(screen.getByTestId('reminders-screen')).toBeTruthy();
    for (const id of ['reminder-fire-done', 'reminder-fire-snooze', 'reminder-fire-dismiss']) expect(within(overlay).getByTestId(id)).toBeTruthy();
  });

  it('Mark done completes the reminder, closes the overlay and opens an Autopilot slot\'s screen', async () => {
    const { gateway } = setup([fire()], { fireId: 'f1' }, withFire((path, method) =>
      method === 'POST' && path === `${LIST}/f1/complete` ? { status: 200, body: { ok: true, data: fire({ status: 'completed' }), autopilot_slot: { ok: true, route: '/autopilot/audiobook' } } } : undefined,
    ));
    fireEvent.press(await screen.findByTestId('reminder-fire-done'));
    await waitFor(() => expect(gateway.called('POST', `${LIST}/f1/complete`)).toHaveLength(1));
    await waitFor(() => expect(screen.queryByTestId('reminder-fire-overlay')).toBeNull());
    expect(router.navigate).toHaveBeenCalledWith('/autopilot/audiobook');
  });

  it('never follows an off-app route from the slot answer', async () => {
    setup([fire()], { fireId: 'f1' }, withFire((path, method) =>
      method === 'POST' && path === `${LIST}/f1/complete` ? { status: 200, body: { ok: true, data: fire(), autopilot_slot: { ok: true, route: '//evil.example/x' } } } : undefined,
    ));
    fireEvent.press(await screen.findByTestId('reminder-fire-done'));
    await waitFor(() => expect(screen.queryByTestId('reminder-fire-overlay')).toBeNull());
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('Snooze posts ten minutes and closes the overlay', async () => {
    const { gateway } = setup([fire()], { fireId: 'f1' }, withFire());
    fireEvent.press(await screen.findByTestId('reminder-fire-snooze'));
    await waitFor(() => expect(gateway.called('POST', `${LIST}/f1/snooze`)).toHaveLength(1));
    expect(gateway.called('POST', `${LIST}/f1/snooze`)[0].body).toEqual({ minutes: 10 });
    await waitFor(() => expect(screen.queryByTestId('reminder-fire-overlay')).toBeNull());
  });

  it('Dismiss acknowledges manually and closes the overlay', async () => {
    const { gateway } = setup([fire()], { fireId: 'f1' }, withFire());
    fireEvent.press(await screen.findByTestId('reminder-fire-dismiss'));
    await waitFor(() => expect(gateway.called('POST', `${LIST}/f1/ack`)).toHaveLength(1));
    expect(gateway.called('POST', `${LIST}/f1/ack`)[0].body).toEqual({ via: 'manual' });
    await waitFor(() => expect(screen.queryByTestId('reminder-fire-overlay')).toBeNull());
  });

  it('a fire id that no longer exists shows the list with a not-found note, not a bare screen', async () => {
    setup([], { fireId: 'gone' }, (path, method) => (path === `${LIST}/gone` && method === 'GET' ? { status: 404, body: { ok: false } } : undefined));
    expect(await screen.findByTestId('reminder-fire-missing')).toHaveTextContent(en('calendarNative.reminders.fireNotFound'));
    expect(screen.queryByTestId('reminder-fire-overlay')).toBeNull();
    expect(screen.getByTestId('reminders-screen')).toBeTruthy();
  });
});
