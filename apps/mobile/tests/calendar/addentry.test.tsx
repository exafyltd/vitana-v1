/**
 * VTID-05530 — the add-entry sheet (twin of `vcal/AddEntrySheet.tsx` + `MobileEventForm.tsx`):
 * open from the + button and from a month/week day, validation, the POST body, "Find a time"
 * (free slots from the gateway, picking one fills the times) and the overlap warning.
 */
import '../helpers/no-network';
import './mocks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { makeFormatters } from '../../src/screens/calendar/format';
import { CalendarScreen } from '../../src/screens/calendar/CalendarScreen';
import { createSupabaseDouble, fakeGateway, freezeClock, has, makeWrapper, todayAt } from './helpers';

afterAll(() => __setSupabaseForTests(null));
// The last-used view is remembered per device: every test starts from a clean device.
beforeEach(() => AsyncStorage.clear());
afterEach(() => __clearToastsForTests());
jest.setTimeout(30000);
freezeClock();

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const fmt = makeFormatters('en');

function setup(opts: { conflicts?: unknown[]; slots?: unknown[]; slotsStatus?: number; createStatus?: number } = {}) {
  const gateway = fakeGateway((path, method) => {
    if (path === '/api/v1/calendar/events/window') return { status: 200, body: { ok: true, data: [], timezone: 'UTC' } };
    if (path === '/api/v1/calendar/conflicts') return { status: 200, body: { ok: true, conflicts: opts.conflicts ?? [] } };
    if (path === '/api/v1/calendar/events/gaps') return { status: opts.slotsStatus ?? 200, body: { ok: (opts.slotsStatus ?? 200) < 400, data: opts.slots ?? [] } };
    if (path === '/api/v1/calendar/events' && method === 'POST') return { status: opts.createStatus ?? 200, body: { ok: (opts.createStatus ?? 200) < 400, data: { id: 'new-1' } } };
    return undefined;
  });
  const { client } = createSupabaseDouble();
  render(<CalendarScreen />, { wrapper: makeWrapper({ client, gateway }) });
  return { gateway };
}

const openSheet = async () => {
  await screen.findByTestId('vcal-empty');
  fireEvent.press(screen.getByTestId('vcal-add'));
  return screen.findByTestId('vcal-add-sheet');
};

describe('add-entry sheet', () => {
  it('opens from the + button with the title, date, times, place and category fields', async () => {
    setup();
    await openSheet();
    expect(screen.getByText(en('vcal.add.title'))).toBeTruthy();
    expect(screen.getByTestId('vcal-form-title')).toBeTruthy();
    expect(screen.getByTestId('vcal-form-today')).toBeTruthy();
    expect(screen.getByTestId('vcal-form-tomorrow')).toBeTruthy();
    expect(screen.getByTestId('vcal-form-location')).toBeTruthy();
    for (const type of ['personal', 'professional', 'health', 'workout', 'community', 'nutrition']) {
      expect(screen.getByText(en(`vcal.form.types.${type}`))).toBeTruthy();
    }
  });

  it('does not create without a title (validation), and cancel closes the sheet', async () => {
    const { gateway } = setup();
    await openSheet();
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), '   ');
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(0);
    fireEvent.press(screen.getByTestId('vcal-form-cancel'));
    await waitFor(() => expect(screen.queryByTestId('vcal-add-sheet')).toBeNull());
  });

  it('creates the entry through the gateway with the chosen day, times, place and category', async () => {
    const { gateway } = setup();
    await openSheet();
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), '  Yoga  ');
    fireEvent.changeText(screen.getByTestId('vcal-form-location'), 'Studio 3');
    fireEvent.press(screen.getByTestId('vcal-type-workout'));
    fireEvent.press(screen.getByTestId('vcal-form-tomorrow'));
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(1));
    const body = gateway.called('POST', '/api/v1/calendar/events')[0].body;
    expect(body).toMatchObject({ title: 'Yoga', location: 'Studio 3', event_type: 'workout', source_type: 'manual', status: 'confirmed' });
    const start = new Date(body.start_time);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(start.getDate()).toBe(tomorrow.getDate());
    expect(start.getMinutes() % 15).toBe(0);
    expect(Date.parse(body.end_time) - Date.parse(body.start_time)).toBe(3_600_000);
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.add.created']));
    await waitFor(() => expect(screen.queryByTestId('vcal-add-sheet')).toBeNull());
  });

  it('shows the error toast and keeps the sheet when the gateway refuses', async () => {
    setup({ createStatus: 500 });
    await openSheet();
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), 'Yoga');
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    await waitFor(() => expect(__toastsForTests().map((x) => x.titleKey)).toEqual(['vcal.add.error']));
    expect(screen.getByTestId('vcal-add-sheet')).toBeTruthy();
  });

  it('opens for the tapped month day', async () => {
    const { gateway } = setup();
    await screen.findByTestId('vcal-empty');
    fireEvent.press(screen.getByTestId('vcal-view-month'));
    await screen.findByTestId('vcal-month');
    const d = new Date();
    d.setDate(d.getDate() === 28 ? 27 : d.getDate() + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fireEvent.press(screen.getByTestId(`vcal-month-day-${key}`));
    fireEvent.press(await screen.findByTestId('vcal-add-day'));
    await screen.findByTestId('vcal-add-sheet');
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), 'On that day');
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(1));
    expect(new Date(gateway.called('POST', '/api/v1/calendar/events')[0].body.start_time).getDate()).toBe(d.getDate());
  });
});

describe('find a time and overlap warning', () => {
  it('asks the gateway for free slots for the set length and picking one fills date and times', async () => {
    const slotStart = todayAt(15, 0, 2);
    const slotEnd = todayAt(16, 30, 2);
    const { gateway } = setup({ slots: [{ start: slotStart, end: slotEnd, duration_minutes: 90, free_until: todayAt(18, 0, 2) }] });
    await openSheet();
    fireEvent.press(screen.getByTestId('vcal-find-time-ask'));
    const slot = await screen.findByTestId('vcal-find-time-slot-0');
    const call = gateway.called('GET', '/api/v1/calendar/events/gaps')[0];
    expect(call.query.get('duration')).toBe('60');
    expect(call.query.get('limit')).toBe('3');
    expect(slot).toHaveTextContent(has(fmt.fmtDate(slotStart, { weekday: 'short', day: 'numeric', month: 'short' })));
    expect(slot).toHaveTextContent(has(fmt.fmtTime(slotStart, { hour: '2-digit', minute: '2-digit' })));
    fireEvent.press(slot);
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), 'Slotted');
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(1));
    const body = gateway.called('POST', '/api/v1/calendar/events')[0].body;
    expect(Date.parse(body.start_time)).toBe(Date.parse(slotStart));
    expect(Date.parse(body.end_time)).toBe(Date.parse(slotEnd));
  });

  it('says so when nothing is free, and when the lookup fails', async () => {
    setup({ slots: [] });
    await openSheet();
    fireEvent.press(screen.getByTestId('vcal-find-time-ask'));
    expect(await screen.findByText(en('vcal.findTime.none'))).toBeTruthy();
  });

  it('shows the lookup error copy on a failed request', async () => {
    setup({ slotsStatus: 500 });
    await openSheet();
    fireEvent.press(screen.getByTestId('vcal-find-time-ask'));
    expect(await screen.findByText(en('vcal.findTime.error'))).toBeTruthy();
  });

  it('warns (never blocks) about a collision: own entry with its title, other calendars as busy time', async () => {
    const { gateway } = setup({
      conflicts: [
        { kind: 'own', title: 'Team call', start_time: todayAt(10), end_time: todayAt(11) },
        { kind: 'external', title: null, start_time: todayAt(10, 30), end_time: todayAt(11, 30) },
      ],
    });
    await openSheet();
    const warning = await screen.findByTestId('vcal-overlap', {}, { timeout: 5000 });
    const range = `${fmt.fmtTime(todayAt(10), { hour: '2-digit', minute: '2-digit' })}–${fmt.fmtTime(todayAt(11), { hour: '2-digit', minute: '2-digit' })}`;
    expect(warning).toHaveTextContent(has(en('vcal.overlap.title')));
    expect(warning).toHaveTextContent(has(`Team call · ${range}`));
    expect(gateway.called('GET', '/api/v1/calendar/conflicts').length).toBeGreaterThan(0);
    // still creatable
    fireEvent.changeText(screen.getByTestId('vcal-form-title'), 'Overlapping anyway');
    fireEvent.press(screen.getByTestId('vcal-form-create'));
    await waitFor(() => expect(gateway.called('POST', '/api/v1/calendar/events')).toHaveLength(1));
  });
});
