/**
 * VTID-05419 — /health on the Spotlight grid (contract SR-31, plan D10).
 *
 * Renders the real Health page (desktop, Spotlight on) with its data hooks
 * mocked, so no network is touched, and proves:
 *  - the frame opts into the grid (`data-screen-layout="spotlight-grid"`, width `full`);
 *  - exactly one Spotlight card, the Vitana Index, in `[data-slot="spotlight"]`,
 *    with its label, ring, five pillar bars, View breakdown and Ask Vitana;
 *  - six `standard` tiles beside it in the planned order;
 *  - "Up next · For you" = the pending Autopilot actions as `compact` cards, the
 *    action that lifts the weakest pillar first; no actions → no row;
 *  - no index → honest empty tiles (no invented numbers); loading → the grid skeleton;
 *  - flag off → no grid (today's desktop screen).
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { VitanaIndexState } from '@/hooks/useVitanaIndex';
import type { AutopilotAction } from '@/types/autopilot';

const h = vi.hoisted(() => ({
  spotlightOn: true,
  index: null as unknown,
  isLoading: false,
  pendingActions: [] as unknown[],
  navigate: vi.fn(),
  orb: vi.fn(),
}));

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => h.spotlightOn }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/components/health/VitanaIndexProvider', () => ({
  useVitanaIndexCache: () => ({ index: h.index, isLoading: h.isLoading }),
}));
vi.mock('@/hooks/use-autopilot', () => ({
  useAutopilot: () => ({
    pendingCount: h.pendingActions.length,
    pendingActions: h.pendingActions,
    getLatestActions: (n = 2) => h.pendingActions.slice(0, n),
  }),
}));
vi.mock('@/hooks/useAutopilotComplete', () => ({ useAutopilotComplete: () => ({ completeBySourceRef: () => {} }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/context/ProfileProvider', () => ({ useProfile: () => ({ profile: null }) }));
vi.mock('@/hooks/useProfileHealthSummary', () => ({ useProfileHealthSummary: () => ({ data: undefined }) }));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/lib/orbActivate', () => ({ activateOrb: h.orb }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k),
  lookup: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => h.navigate,
}));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-header-density={p.density ?? 'default'}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/ui/expandable-search-button', () => ({ ExpandableSearchButton: () => null }));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/health/VitanaBaselineSurveyModal', () => ({ default: () => null }));
vi.mock('@/components/AutopilotPopup', () => ({
  AutopilotPopup: (p: { open: boolean }) => (p.open ? <div data-testid="autopilot-popup" /> : null),
}));
vi.mock('@/components/HealthMasterActionPopup', () => ({ HealthMasterActionPopup: () => null }));
vi.mock('@/components/health/mobile/HealthReportUploadSheet', () => ({ HealthReportUploadSheet: () => null }));
vi.mock('@/components/health/mobile/QuickLabOrderSheet', () => ({ QuickLabOrderSheet: () => null }));
vi.mock('@/components/health/VitanaPillarAgentsPanel', () => ({ default: () => <div data-testid="pillar-agents" /> }));
vi.mock('@/components/health/NextBestActionCard', () => ({ default: () => <div data-testid="next-best-action" /> }));
vi.mock('@/components/health/MotivationalDataCard', () => ({ default: () => null }));
vi.mock('@/components/health/CompactVitanaIndex', () => ({ default: () => <div data-testid="compact-index" /> }));
vi.mock('@/components/health/HealthCoachChat', () => ({ default: () => null }));

import Health from '@/pages/Health';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';

const INDEX = {
  total: 412,
  tier: { min: 0, max: 999, label: 'Building', labelKey: 'vitanaIndex.tiers.building', color: '#000' },
  pillars: { nutrition: 120, hydration: 80, exercise: 60, sleep: 100, mental: 52 },
  subscores: null,
  balanceFactor: null,
  history: [
    { date: '2026-10-25', score: 380 },
    { date: '2026-10-28', score: 396 },
    { date: '2026-10-31', score: 412 },
  ],
  pillarHistory: [],
  trend: 'up',
  confidence: 1,
  isBaseline: false,
  lastUpdated: '2026-10-31',
} as unknown as VitanaIndexState;

const action = (id: string, title: string, vector?: AutopilotAction['contributionVector']): AutopilotAction =>
  ({ id, title, reason: `${title} reason`, category: 'health', priority: 'medium', icon: '✨', timestamp: new Date(), status: 'pending', selected: true, contributionVector: vector }) as AutopilotAction;

const renderHealth = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })}>
      <MemoryRouter initialEntries={['/health']}>
        <Health />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  h.spotlightOn = true;
  h.index = INDEX;
  h.isLoading = false;
  h.pendingActions = [];
  h.navigate.mockReset();
  h.orb.mockReset();
});

describe('VTID-05419 /health Spotlight grid — structure', () => {
  it('opts the frame into the grid and renders one Spotlight card (the Vitana Index) in the spotlight slot', () => {
    const { container } = renderHealth();
    const frame = container.querySelector('[data-archetype="dashboard"]') as HTMLElement;
    expect(frame.getAttribute('data-screen-layout')).toBe('spotlight-grid');
    expect(frame.querySelector('[data-spotlight-layout]')!.getAttribute('data-width')).toBe('full');

    const grid = container.querySelector('[data-spotlight-grid]') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    const spot = grid.querySelector('[data-slot="spotlight"]') as HTMLElement;
    const hero = spot.querySelector('[data-vcard-size="spotlight"]') as HTMLElement;
    expect(hero.getAttribute('data-testid')).toBe('spotlight-vitana-index-hero');
    expect(hero.querySelector('[data-vcard-spotlight-label]')!.textContent).toBe('spotlight.grid.label');
    expect(hero.querySelector('[data-vitana-index-ring]')).not.toBeNull();
    expect(hero.querySelectorAll('li').length).toBe(5);
    expect(within(hero).getByTestId('spotlight-vitana-index-score').textContent).toMatch(/412/);
  });

  it('six standard tiles beside the spotlight, in the planned order', () => {
    const { container } = renderHealth();
    const tiles = container.querySelector('[data-spotlight-grid] [data-slot="tiles"]') as HTMLElement;
    const cards = [...tiles.querySelectorAll('[data-vcard-size]')];
    expect(cards.map((c) => c.getAttribute('data-vcard-size'))).toEqual(Array(6).fill('standard'));
    expect(cards.map((c) => c.getAttribute('data-health-tile'))).toEqual(['sleep', 'exercise', 'nutrition', 'biology', 'trend', 'today-plan']);
    expect(cards[0].querySelector('[data-health-tile-value]')!.textContent).toMatch(/100/);
    expect(cards[1].querySelector('[data-health-tile-value]')!.textContent).toMatch(/60/);
    expect(cards[2].querySelector('[data-health-tile-value]')!.textContent).toMatch(/120/);
    expect(cards[4].querySelector('[data-health-tile-value]')!.textContent).toMatch(/412/);
    // every tile is a named button (keyboard + screen reader)
    for (const c of cards) {
      expect(c.getAttribute('role')).toBe('button');
      expect(c.getAttribute('tabindex')).toBe('0');
      expect(c.getAttribute('aria-label')).toBeTruthy();
    }
    // the legacy stacked panels are not on the grid
    expect(screen.queryByTestId('pillar-agents')).toBeNull();
    expect(screen.queryByTestId('next-best-action')).toBeNull();
  });

  it('"Up next · For you": pending actions as compact cards, the weakest-pillar lift first', () => {
    // weakest pillar of INDEX is mental (52)
    h.pendingActions = [action('a1', 'Walk'), action('a2', 'Breathe', { mental: 4 }), action('a3', 'Water')];
    const { container } = renderHealth();
    const row = container.querySelector('[data-spotlight-grid] [data-slot="row"]') as HTMLElement;
    expect(row).not.toBeNull();
    expect(within(row).getByText('spotlight.grid.health.upNext')).toBeTruthy();
    const cards = [...row.querySelectorAll('[data-vcard-size]')];
    expect(cards.every((c) => c.getAttribute('data-vcard-size') === 'compact')).toBe(true);
    expect(cards.map((c) => c.getAttribute('data-health-up-next'))).toEqual(['a2', 'a1', 'a3']);
    // compact cards only in the row, never among the tiles
    expect(container.querySelectorAll('[data-slot="tiles"] [data-vcard-size="compact"]').length).toBe(0);
  });

  it('no pending actions → no "Up next" row, Today\'s plan says so honestly', () => {
    const { container } = renderHealth();
    expect(container.querySelector('[data-slot="row"]')).toBeNull();
    const plan = container.querySelector('[data-health-tile="today-plan"]') as HTMLElement;
    expect(plan.textContent).toContain('spotlight.grid.emptyTiles');
  });
});

describe('VTID-05419 /health Spotlight grid — real data only', () => {
  it('no index yet → no invented numbers on the hero or the tiles', () => {
    h.index = null;
    const { container } = renderHealth();
    expect(screen.getByTestId('spotlight-vitana-index-score').textContent).toBe('—');
    const values = [...container.querySelectorAll('[data-health-tile-value]')].map((v) => v.textContent);
    expect(values).toEqual(['—', '—', '—', '—']);
    expect(container.querySelector('[data-slot="tiles"]')!.textContent).not.toMatch(/\d/);
    expect(container.querySelectorAll('[data-slot="spotlight"] li').length).toBe(0);
  });

  it('a single history day → no trend bars and no trend number', () => {
    h.index = { ...INDEX, history: [{ date: '2026-10-31', score: 412 }] };
    const { container } = renderHealth();
    const trend = container.querySelector('[data-health-tile="trend"]') as HTMLElement;
    expect(trend.querySelector('[data-health-tile-value]')!.textContent).toBe('—');
    expect(trend.textContent).toContain('spotlight.grid.emptyTiles');
  });

  it('loading → the grid skeleton (1 spotlight + 6 standard), never a spinner', () => {
    h.index = null;
    h.isLoading = true;
    const { container } = renderHealth();
    const skel = container.querySelector('[data-archetype-skeleton="dashboard"][data-skeleton-layout="spotlight-grid"]') as HTMLElement;
    expect(skel).not.toBeNull();
    expect(skel.querySelectorAll('[data-slot="spotlight"] [data-vcard-skeleton][data-vcard-size="spotlight"]').length).toBe(1);
    expect(skel.querySelectorAll('[data-slot="tiles"] [data-vcard-skeleton][data-vcard-size="standard"]').length).toBe(6);
    expect(container.querySelector('.animate-spin')).toBeNull();
  });
});

describe('VTID-05419 /health Spotlight grid — actions', () => {
  it('View breakdown opens the Index sheet; Ask Vitana opens Vitana', () => {
    const opened = vi.fn();
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, opened);
    renderHealth();
    fireEvent.click(screen.getByText('spotlight.grid.health.viewBreakdown'));
    expect(opened).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('spotlight.grid.health.askVitana'));
    expect(h.orb).toHaveBeenCalledTimes(1);
    expect(opened).toHaveBeenCalledTimes(1);
    window.removeEventListener(VITANA_INDEX_OPEN_EVENT, opened);
  });

  it('My Biology goes to /health/my-biology; Today\'s plan and Up next open Autopilot; a pillar tile opens the sheet', () => {
    h.pendingActions = [action('a1', 'Walk')];
    const opened = vi.fn();
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, opened);
    const { container } = renderHealth();
    fireEvent.keyDown(container.querySelector('[data-health-tile="biology"]')!, { key: 'Enter' });
    expect(h.navigate).toHaveBeenCalledWith('/health/my-biology');
    fireEvent.click(container.querySelector('[data-health-tile="sleep"]')!);
    expect(opened).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('autopilot-popup')).toBeNull();
    fireEvent.click(container.querySelector('[data-health-tile="today-plan"]')!);
    expect(screen.getByTestId('autopilot-popup')).toBeTruthy();
    window.removeEventListener(VITANA_INDEX_OPEN_EVENT, opened);
  });
});

describe('VTID-05419 flag off — today\'s desktop screen, no grid', () => {
  it('renders no Spotlight frame and keeps the legacy panels', () => {
    h.spotlightOn = false;
    const { container } = renderHealth();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-grid]')).toBeNull();
    expect(screen.getByTestId('pillar-agents')).toBeTruthy();
    expect(screen.getByTestId('next-best-action')).toBeTruthy();
  });
});
