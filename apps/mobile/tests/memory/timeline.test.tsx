/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — /memory/timeline
 * (MEMORY.TIMELINE): the Index spotlight, the day list and its rows, the
 * filters, the detail sheet (hide from Vitana, delete) and the loading /
 * empty / error states — fake gateway, no network.
 */
import '../helpers/no-network';
import { router } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { MemoryTimeline } from '../../src/screens/memory/MemoryTimeline';
import { FAIL, memoryWrapper, moment, spotlight, todayIso, type Req } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => router.navigate.mockClear());

const indexDay = { kind: 'index_day', id: 'd-1', date: todayIso.slice(0, 10), delta_total: 5, score_total_after: 412, delta_pillars: { hydration: 4, sleep: 1 }, top_pillar: 'hydration', movements: 2, daily_update: false };
const digest = { kind: 'day_digest', id: 'g-1', date: todayIso.slice(0, 10), counts: { water_logged: 3 }, total: 3 };

const routes = {
  'GET /timeline/spotlight': { spotlight },
  'GET /timeline': { items: [moment, indexDay, digest], next_cursor: null },
  'GET /timeline/m-1': { item: moment, detail: { index_before: { hydration: 66 }, index_after: { hydration: 70 }, used_by_vitana: true, why_kept_key: 'x' } },
};

describe('MemoryTimeline', () => {
  it('renders the Index spotlight and the day with a moment, an Index change and a digest', async () => {
    const { wrapper } = memoryWrapper(routes);
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-index-spotlight')).toBeTruthy());
    expect(screen.getByTestId('timeline-pillar-sleep')).toBeTruthy();
    expect(screen.getByText('Strengthen Sleep')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('timeline-moment')).toBeTruthy());
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('You drank water')).toBeTruthy();
    expect(screen.getByTestId('timeline-influence-measured')).toBeTruthy();
    expect(screen.getByTestId('timeline-index-day')).toBeTruthy();
    expect(screen.getByText('Your day: 3 little things')).toBeTruthy();
  });

  it('shows the empty state, the filtered empty state and clears the filters', async () => {
    const { wrapper, requests } = memoryWrapper({ ...routes, 'GET /timeline': { items: [], next_cursor: null } });
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-empty')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-chip-sleep'));
    await waitFor(() => expect(requests.some((r: Req) => r.path === '/timeline' && r.query.get('pillar') === 'sleep')).toBe(true));
    await waitFor(() => expect(screen.getByText('No entries for this filter.')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-clear'));
    await waitFor(() => expect(screen.queryByTestId('timeline-clear')).toBeNull());
  });

  it('sends the search term only from two characters and filters by area under More', async () => {
    const { wrapper, requests } = memoryWrapper(routes);
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-moment')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('timeline-search'), 'w');
    fireEvent.changeText(screen.getByTestId('timeline-search'), 'wa');
    await waitFor(() => expect(requests.some((r) => r.path === '/timeline' && r.query.get('q') === 'wa')).toBe(true));
    expect(requests.some((r) => r.query.get('q') === 'w')).toBe(false);
    fireEvent.press(screen.getByTestId('timeline-chip-more'));
    fireEvent.press(screen.getByTestId('timeline-cat-diary'));
    await waitFor(() => expect(requests.some((r) => r.path === '/timeline' && r.query.get('category') === 'diary')).toBe(true));
  });

  it('shows the error states with retry', async () => {
    const { wrapper } = memoryWrapper({ 'GET /timeline/spotlight': FAIL, 'GET /timeline': FAIL });
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-error')).toBeTruthy());
    expect(screen.getByTestId('timeline-spotlight-error')).toBeTruthy();
    expect(screen.getByTestId('timeline-error-retry')).toBeTruthy();
  });

  it('shows the no-Index notice when there is no spotlight yet', async () => {
    const { wrapper } = memoryWrapper({ ...routes, 'GET /timeline/spotlight': { spotlight: null } });
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-no-index')).toBeTruthy());
  });

  it('loads the next page through the cursor', async () => {
    const second = { ...moment, id: 'm-2', topic: 'meal_logged' };
    const { wrapper } = memoryWrapper({
      ...routes,
      'GET /timeline': (r: Req) => (r.query.get('cursor') === 'c2' ? { items: [second], next_cursor: null } : { items: [moment], next_cursor: 'c2' }),
    });
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-load-more')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-load-more'));
    await waitFor(() => expect(screen.getByText('You logged a meal')).toBeTruthy());
    expect(screen.getAllByTestId('timeline-moment')).toHaveLength(2);
  });

  it('opens a moment: measured effect, sensitive note, hide-from-Vitana switch and delete', async () => {
    const { wrapper, requests } = memoryWrapper({ ...routes, 'POST /timeline/m-1/hide-from-ai': { ok: true }, 'DELETE /timeline/m-1': { ok: true } });
    render(<MemoryTimeline />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('timeline-moment')).toBeTruthy());
    fireEvent.press(screen.getByTestId('timeline-moment'));
    await waitFor(() => expect(screen.getByTestId('timeline-detail-measured')).toBeTruthy());
    expect(screen.getByText('This is sensitive health information', { exact: false })).toBeTruthy();
    fireEvent.press(screen.getByTestId('timeline-learn-switch'));
    await waitFor(() => expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ hidden: true }));
    fireEvent.press(screen.getByTestId('timeline-delete'));
    await waitFor(() => expect(screen.getByTestId('timeline-delete-confirm')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByTestId('timeline-delete-confirm'));
    });
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.path === '/timeline/m-1')).toBe(true));
  });

  it('the transparency link opens the permissions screen', async () => {
    const { wrapper } = memoryWrapper(routes);
    render(<MemoryTimeline />, { wrapper });
    fireEvent.press(screen.getByTestId('timeline-transparency-link'));
    expect(router.navigate).toHaveBeenCalledWith('/memory/permissions');
  });
});
