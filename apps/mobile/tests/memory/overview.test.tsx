/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — /memory (MEMORY.OVERVIEW):
 * the week story, routines, what Vitana knows and the Memory Garden in their
 * loaded / empty / error states, the category detail sheet, Add Memory, the
 * Timeline and Education panes — fake gateway, no network.
 */
import '../helpers/no-network';
import { router, searchParams } from './mocks';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { __setSupabaseForTests } from '../../src/auth/client';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { __clearToastsForTests, __toastsForTests } from '../../src/ports/ui';
import { MemoryOverview } from '../../src/screens/memory/MemoryOverview';
import { FAIL, gardenRoutes, memoryWrapper, overviewRoutes } from './helpers';

afterAll(() => {
  __setSupabaseForTests(null);
  __setGatewayForTests(null);
});
beforeEach(() => {
  searchParams.current = {};
  router.navigate.mockClear();
  __clearToastsForTests();
});

describe('MemoryOverview — categories pane', () => {
  it('renders the week story, routines, what Vitana knows and the garden counts', async () => {
    const { wrapper } = memoryWrapper(overviewRoutes);
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-week-story')).toBeTruthy());
    expect(screen.getByText('412')).toBeTruthy();
    expect(screen.getByTestId('memory-week-rising')).toBeTruthy();
    expect(screen.getByTestId('memory-week-slipping')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByTestId('memory-routine')).toHaveLength(1));
    expect(screen.getByText("You're mostly active in the morning")).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('memory-what-vitana-knows')).toBeTruthy());
    expect(screen.getByText('Morning walks')).toBeTruthy();
    // The en catalog value is "{value0}total memories …" (no space; the web shows the same text).
    await waitFor(() => expect(screen.getByTestId('memory-garden-summary').props.children).toMatch(/^3\s?total memories across all categories$/));
    expect(screen.getByTestId('memory-category-count-health-wellness').props.children).toBe('3 memories · 20%');
    expect(screen.getByTestId('memory-category-count-finance-assets').props.children).toBe('0 memories · 0%');
  });

  it('shows the empty states: no Vitana Index, no routines, no self-awareness card', async () => {
    const { wrapper } = memoryWrapper({
      ...gardenRoutes,
      'GET /timeline/spotlight': { spotlight: null },
      'GET /timeline/routines': { routines: [] },
      'GET /presence/self-awareness-summary': { ok: true, items: [], last_refreshed_at: null, user_controls: {} },
    });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-week-empty')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('memory-routines-empty')).toBeTruthy());
    fireEvent.press(screen.getByText('Take the starting check'));
    expect(router.navigate).toHaveBeenCalledWith('/health/vitana-index');
    expect(screen.queryByTestId('memory-what-vitana-knows')).toBeNull();
  });

  it('never shows zero counts when the garden fails to load', async () => {
    const { wrapper } = memoryWrapper({ ...overviewRoutes, 'GET /memory/garden/categories': FAIL });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-garden-summary').props.children).toBe("Your memories couldn't be loaded right now."));
    expect(screen.getByTestId('memory-category-count-health-wellness').props.children).toBe("Your memories couldn't be loaded right now.");
  });

  it('hides the routines card when routines fail (web parity)', async () => {
    const { wrapper } = memoryWrapper({ ...overviewRoutes, 'GET /timeline/routines': FAIL });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-week-story')).toBeTruthy());
    await waitFor(() => expect(screen.queryByTestId('memory-card-skeleton')).toBeNull());
    expect(screen.queryByTestId('memory-routines')).toBeNull();
  });

  it('forgets a routine through the gateway', async () => {
    const { wrapper, requests } = memoryWrapper({ ...overviewRoutes, 'DELETE /timeline/routines/r1': { ok: true } });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-routine-forget-r1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-routine-forget-r1'));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.path === '/timeline/routines/r1')).toBe(true));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('memoryLearning.toast.forgotten'));
  });

  it('opens a category, lists its memories and deletes one', async () => {
    const { wrapper, requests } = memoryWrapper({ ...overviewRoutes, 'DELETE /memory/garden/entries/fact/f1': { ok: true } });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-category-health-wellness')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-category-health-wellness'));
    await waitFor(() => expect(screen.getByText('Drinks green tea every morning')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-delete-fact:f1'));
    await waitFor(() => expect(requests.some((r) => r.method === 'DELETE' && r.path === '/memory/garden/entries/fact/f1')).toBe(true));
  });

  it('quick-categorizes an uncategorized memory (PATCH with the new category)', async () => {
    const { wrapper, requests } = memoryWrapper({ ...overviewRoutes, 'PATCH /memory/garden/entries/episode/e1': { ok: true } });
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-category-general')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-category-general'));
    await waitFor(() => expect(screen.getByText('Walked by the river')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-quick-episode:e1-future-plans'));
    await waitFor(() => expect(requests.find((r) => r.method === 'PATCH')?.body).toEqual({ content: 'Walked by the river', category: 'future_plans' }));
  });

  it('adds a memory through the diary write path', async () => {
    const { wrapper, requests } = memoryWrapper({ ...overviewRoutes, 'POST /memory/diary/entries': { entry: { id: 'd1', created_at: 'x' }, memory_item_id: null, index: null } });
    render(<MemoryOverview />, { wrapper });
    fireEvent.press(screen.getByTestId('memory-add-open'));
    await waitFor(() => expect(screen.getByTestId('memory-add-content')).toBeTruthy());
    fireEvent.press(screen.getByTestId('memory-add-category-health-wellness'));
    fireEvent.changeText(screen.getByTestId('memory-add-content'), 'Slept eight hours');
    await act(async () => {
      fireEvent.press(screen.getByTestId('memory-add-save'));
    });
    await waitFor(() => expect(requests.find((r) => r.method === 'POST')?.body).toEqual({ text: 'Slept eight hours', source: 'manual', tags: ['health-wellness', 'diary'], attachments: null }));
    await waitFor(() => expect(__toastsForTests().map((t) => t.titleKey)).toContain('toasts.memory.memorySaved'));
  });
});

describe('MemoryOverview — timeline and education panes', () => {
  it('?tab=timeline lists the garden entries newest first and expands one', async () => {
    searchParams.current = { tab: 'timeline' };
    const { wrapper } = memoryWrapper(overviewRoutes);
    render(<MemoryOverview />, { wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-timeline-tab')).toBeTruthy());
    expect(screen.getByText('AI Insight')).toBeTruthy();
    expect(screen.getByText('Confidence: 80%')).toBeTruthy();
    fireEvent.press(screen.getByTestId('memory-entry-episode:e1'));
    expect(screen.getByTestId('memory-entry-expanded-episode:e1')).toBeTruthy();
  });

  it('timeline pane: empty and error states', async () => {
    searchParams.current = { tab: 'timeline' };
    const empty = memoryWrapper({ ...overviewRoutes, 'GET /memory/garden/entries': { entries: [] } });
    const r1 = render(<MemoryOverview />, { wrapper: empty.wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-timeline-tab-empty')).toBeTruthy());
    r1.unmount();
    const failing = memoryWrapper({ ...overviewRoutes, 'GET /memory/garden/entries': FAIL });
    render(<MemoryOverview />, { wrapper: failing.wrapper });
    await waitFor(() => expect(screen.getByTestId('memory-timeline-tab-error')).toBeTruthy());
  });

  it('the education pane shows the six articles from the catalog', async () => {
    const { wrapper } = memoryWrapper(overviewRoutes);
    render(<MemoryOverview />, { wrapper });
    fireEvent.press(screen.getByTestId('memory-tab-education'));
    expect(screen.getByTestId('memory-education-tab')).toBeTruthy();
    expect(screen.getByText('How Sleep Quality Impacts Memory Formation')).toBeTruthy();
    expect(screen.getAllByText('High impact')).toHaveLength(4);
    expect(screen.getByTestId('memory-education-coming-soon')).toBeTruthy();
  });

  it('the sub-navigation goes to the other memory screens and the diary', async () => {
    const { wrapper } = memoryWrapper(overviewRoutes);
    render(<MemoryOverview />, { wrapper });
    fireEvent.press(screen.getByTestId('memory-subnav-timeline'));
    expect(router.navigate).toHaveBeenLastCalledWith('/memory/timeline');
    fireEvent.press(screen.getByTestId('memory-subnav-diary'));
    expect(router.navigate).toHaveBeenLastCalledWith('/daily-diary');
  });
});
