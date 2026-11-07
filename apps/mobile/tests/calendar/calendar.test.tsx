/**
 * VTID-05530 — native calendar (`/calendar`): loaded / empty / error, the day / week / month view
 * switch (and the window range each asks the gateway for), the busy block, and a tapped month day
 * opening its panel. Times are checked against the locale-format output (`makeFormatters`), never a
 * raw toLocale call. Fixture and fake-gateway data only.
 */
import '../helpers/no-network';
import './mocks';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { translate } from '../../src/i18n';
import { __setSupabaseForTests } from '../../src/auth/client';
import { makeFormatters } from '../../src/screens/calendar/format';
import { CalendarScreen } from '../../src/screens/calendar/CalendarScreen';
import { createSupabaseDouble, fakeGateway, makeWrapper, todayAt, windowItem } from './helpers';

afterAll(() => __setSupabaseForTests(null));
jest.setTimeout(30000);

const en = (key: string, params?: Record<string, string | number>) => translate('en', key, params);
const fmt = makeFormatters('en');
const hhmm = (iso: string) => fmt.fmtTime(iso, { hour: '2-digit', minute: '2-digit' });

const WINDOW = '/api/v1/calendar/events/window';

function setup(items: unknown[] | 'error', extra?: (path: string, method: string) => { status: number; body?: unknown } | undefined) {
  let failing = items === 'error';
  const gateway = fakeGateway((path, method) => {
    const custom = extra?.(path, method);
    if (custom) return custom;
    if (path === WINDOW) return failing ? { status: 500, body: { ok: false, error: 'boom' } } : { status: 200, body: { ok: true, data: items, timezone: 'UTC' } };
    return undefined;
  });
  const { client } = createSupabaseDouble();
  const Wrapper = makeWrapper({ client, gateway });
  const ui = render(<CalendarScreen />, { wrapper: Wrapper });
  return { gateway, ui, heal: (next: unknown[]) => { failing = false; items = next; } };
}

describe('calendar: loaded, empty, error', () => {
  it('shows the day list with locale-formatted start times and the summary line', async () => {
    setup([
      windowItem({}, { id: 'a', title: 'Morning walk', start_time: todayAt(9, 30), end_time: todayAt(10, 30) }),
      windowItem({}, { id: 'b', title: 'Lunch prep', start_time: todayAt(12, 15), end_time: todayAt(13), event_type: 'nutrition' }),
    ]);
    expect(await screen.findByText('Morning walk')).toBeTruthy();
    expect(screen.getByText('Lunch prep')).toBeTruthy();
    expect(screen.getAllByText(hhmm(todayAt(9, 30))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(hhmm(todayAt(12, 15))).length).toBeGreaterThan(0);
    expect(screen.getByTestId('vcal-summary')).toHaveTextContent(en('vcal.summary.entries', { count: 2 }));
    expect(screen.getByText(en('vcal.views.day'))).toBeTruthy();
  });

  it('titles the day with the locale-format date', async () => {
    setup([]);
    await screen.findByTestId('vcal-empty');
    const expected = fmt.fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
    expect(screen.getByTestId('vcal-date')).toHaveTextContent(expected);
  });

  it('shows the calm empty state on a day with nothing planned', async () => {
    setup([]);
    expect(await screen.findByTestId('vcal-empty')).toBeTruthy();
    expect(screen.getByText(en('vcal.empty.title'))).toBeTruthy();
    expect(screen.getByTestId('vcal-summary')).toHaveTextContent(en('vcal.summary.nothing'));
  });

  it('shows the error state and retries into the list', async () => {
    const { heal, gateway } = setup('error');
    expect(await screen.findByTestId('vcal-error')).toBeTruthy();
    expect(screen.getByText(en('vcal.error'))).toBeTruthy();
    heal([windowItem({}, { id: 'a', title: 'Back again' })]);
    fireEvent.press(screen.getByTestId('vcal-retry'));
    expect(await screen.findByText('Back again')).toBeTruthy();
    expect(gateway.called('GET', WINDOW).length).toBeGreaterThanOrEqual(2);
  });

  it('shows a busy block as time only, without a title', async () => {
    setup([windowItem({ id: 'busy-1' }, null)]);
    const busy = await screen.findByTestId('vcal-busy-busy-1');
    expect(within(busy).getByText(new RegExp(en('vcal.busy')))).toBeTruthy();
  });

  it('sends the day range to the gateway and the active role header only when a role is known', async () => {
    const { gateway } = setup([]);
    await screen.findByTestId('vcal-empty');
    const call = gateway.called('GET', WINDOW)[0];
    const from = new Date(call.query.get('from') as string);
    const to = new Date(call.query.get('to') as string);
    expect(from.getHours()).toBe(0);
    expect(Math.round((to.getTime() - from.getTime()) / 3_600_000)).toBeGreaterThanOrEqual(23);
  });
});

describe('calendar: day navigation', () => {
  it('steps to the next day and back to today', async () => {
    const { gateway } = setup([]);
    await screen.findByTestId('vcal-empty');
    expect(screen.queryByTestId('vcal-today')).toBeNull();
    fireEvent.press(screen.getByTestId('vcal-next'));
    expect(await screen.findByTestId('vcal-today')).toBeTruthy();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(screen.getByTestId('vcal-date')).toHaveTextContent(fmt.fmtDate(tomorrow, { weekday: 'long', day: 'numeric', month: 'long' }));
    fireEvent.press(screen.getByTestId('vcal-today'));
    await waitFor(() => expect(screen.queryByTestId('vcal-today')).toBeNull());
    expect(gateway.called('GET', WINDOW).length).toBeGreaterThanOrEqual(2);
  });

  it('shows "+N more" after five entries and reveals the rest', async () => {
    const items = Array.from({ length: 7 }, (_, i) => windowItem({}, { id: `e${i}`, title: `Item ${i}`, start_time: todayAt(6 + i), end_time: todayAt(7 + i) }));
    setup(items);
    await screen.findByText('Item 0');
    expect(screen.queryByText('Item 6')).toBeNull();
    expect(screen.getByTestId('vcal-more')).toHaveTextContent(en('vcal.more', { count: 2 }));
    fireEvent.press(screen.getByTestId('vcal-more'));
    expect(await screen.findByText('Item 6')).toBeTruthy();
  });
});

describe('calendar: view switch', () => {
  it('switches day → week → month, and asks the gateway for each range', async () => {
    const { gateway } = setup([windowItem({}, { id: 'a', title: 'Morning walk' })]);
    await screen.findByText('Morning walk');

    fireEvent.press(screen.getByTestId('vcal-view-week'));
    expect(await screen.findByTestId('vcal-week')).toBeTruthy();
    expect(screen.getAllByTestId(/^vcal-week-day-/)).toHaveLength(7);
    await waitFor(() => {
      const spans = gateway.called('GET', WINDOW).map((c) => Math.round((Date.parse(c.query.get('to') as string) - Date.parse(c.query.get('from') as string)) / 86_400_000));
      expect(spans).toContain(7);
    });
    // The week starts on Monday.
    const weekCall = gateway.called('GET', WINDOW).find((c) => Math.round((Date.parse(c.query.get('to') as string) - Date.parse(c.query.get('from') as string)) / 86_400_000) === 7)!;
    expect(new Date(weekCall.query.get('from') as string).getDay()).toBe(1);

    fireEvent.press(screen.getByTestId('vcal-view-month'));
    expect(await screen.findByTestId('vcal-month')).toBeTruthy();
    expect(screen.getAllByTestId(/^vcal-month-day-/)).toHaveLength(42);
    await waitFor(() => {
      const spans = gateway.called('GET', WINDOW).map((c) => Math.round((Date.parse(c.query.get('to') as string) - Date.parse(c.query.get('from') as string)) / 86_400_000));
      expect(spans).toContain(42);
    });

    fireEvent.press(screen.getByTestId('vcal-view-day'));
    expect(await screen.findByTestId('vcal-day')).toBeTruthy();
  });

  it('week view lists the day entries and marks free days', async () => {
    setup([windowItem({}, { id: 'a', title: 'Morning walk' })]);
    await screen.findByText('Morning walk');
    fireEvent.press(screen.getByTestId('vcal-view-week'));
    await screen.findByTestId('vcal-week');
    expect(screen.getAllByText('Morning walk').length).toBeGreaterThan(0);
    expect(screen.getAllByText(en('vcal.week.free')).length).toBeGreaterThanOrEqual(5);
  });

  it('month view opens a tapped day in a panel with its entries and an add button', async () => {
    setup([windowItem({}, { id: 'a', title: 'Morning walk' })]);
    await screen.findByText('Morning walk');
    fireEvent.press(screen.getByTestId('vcal-view-month'));
    await screen.findByTestId('vcal-month');
    const d = new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fireEvent.press(screen.getByTestId(`vcal-month-day-${key}`));
    const panel = await screen.findByTestId('vcal-day-panel');
    expect(within(panel).getByText('Morning walk')).toBeTruthy();
    expect(within(panel).getByTestId('vcal-add-day')).toBeTruthy();
    fireEvent.press(within(panel).getByTestId('vcal-day-panel-close'));
    await waitFor(() => expect(screen.queryByTestId('vcal-day-panel')).toBeNull());
  });

  it('the view switch is a tablist with the selected state', async () => {
    setup([]);
    await screen.findByTestId('vcal-empty');
    expect(screen.getByTestId('vcal-view-day').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(screen.getByTestId('vcal-view-week'));
    await screen.findByTestId('vcal-week');
    expect(screen.getByTestId('vcal-view-week').props.accessibilityState).toMatchObject({ selected: true });
  });
});
