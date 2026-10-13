/**
 * VTID-05117 — Phase 7.5 building blocks: the My Journey hero, the Business
 * Hub hero, the product detail body and the shared states. Everything is
 * mocked — no network, no Supabase.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/health/VitanaIndexProvider', () => ({ useVitanaIndexCache: () => ({ index: null }) }));
vi.mock('@/components/health/VitanaIndexSheet', () => ({ VITANA_INDEX_OPEN_EVENT: 'vitana-index-open' }));

let earnings = {
  totalEarnings: 1234.5,
  earnings30Days: 200,
  pendingPayout: 50,
  inWallet: 10,
  recentTransactions: [] as unknown[],
};
let earningsLoading = false;
vi.mock('@/hooks/useUnifiedEarnings', () => ({ useUnifiedEarnings: () => ({ earnings, isLoading: earningsLoading }) }));
vi.mock('@/components/business/BusinessAcceleratorCenterCTA', () => ({ BusinessAcceleratorCenterCTA: () => <div data-testid="accelerator" /> }));
vi.mock('@/components/business/MissionOpportunitiesCard', () => ({ MissionOpportunitiesCard: () => <div data-testid="missions" /> }));
vi.mock('@/components/business/CommercePartnerCard', () => ({ CommercePartnerCard: () => <div data-testid="commerce" /> }));
const ledger = vi.fn();
vi.mock('@/components/business/EarningsHistoryLedger', () => ({
  EarningsHistoryLedger: (p: { transactions: unknown[] }) => {
    ledger(p.transactions);
    return <div data-testid="ledger" data-count={p.transactions.length} />;
  },
}));
vi.mock('@/components/cart/AddToCartButton', () => ({ AddToCartButton: () => <button type="button">cart</button> }));
vi.mock('@/components/sharing/UniversalShareButton', () => ({ UniversalShareButton: () => null }));
vi.mock('@/components/bookmarks/BookmarkButton', () => ({ BookmarkButton: () => null }));
vi.mock('@/components/discover/RecommendButton', () => ({ RecommendButton: () => null }));
vi.mock('@/components/discover/AffiliateDisclosure', () => ({ AffiliateDisclosure: () => null }));

import { JourneyHero, JourneyRail } from './JourneySpotlight';
import { journeyProgressLabel } from './journey-model';
import { BusinessHero, BusinessOverviewSpotlight } from './BusinessSpotlight';
import { ProductDetailSpotlight } from './ProductDetailSpotlight';
import { SpotlightEmpty, SpotlightError, SpotlightGridSkeleton, SpotlightNotice, SpotlightPanel } from './MemberSpotlight';
import { SettingRow } from './SettingRow';
import type { MyJourneyGoal, MyJourneyJourney } from '@/hooks/useMyJourney';
import type { MarketplaceProduct } from '@/hooks/useMarketplace';

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);
const spotlights = (c: HTMLElement) => c.querySelectorAll('[data-vcard-size="spotlight"]');

const goal: MyJourneyGoal = {
  active_goal_text: 'Run a 10k',
  pillar_focus: 'movement',
  confidence_score: null,
  target_date: '2026-12-01',
  target_value: null,
  target_unit: null,
  set_at: '2026-10-01',
  has_deadline: true,
  days_to_deadline: 49,
  goal_total_days: 61,
  goal_day: 12,
  goal_progress_pct: 20,
};
const journey = { day_in_journey: 5, total_days: 90 } as MyJourneyJourney;

const heroProps = { onSetGoal: vi.fn(), onRetry: vi.fn(), onOpenPlan: vi.fn() };

describe('VTID-05117 JourneyHero — the one spotlight card of My Journey', () => {
  it('loading: a spotlight-shaped skeleton, never a spinner', () => {
    const { container } = wrap(<JourneyHero goal={null} journey={null} loading error={false} {...heroProps} />);
    expect(container.querySelector('[data-vcard-skeleton]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('no goal: a text-only spotlight card that invites the member to set one', () => {
    const onSetGoal = vi.fn();
    const { container } = wrap(<JourneyHero goal={null} journey={null} loading={false} error={false} {...heroProps} onSetGoal={onSetGoal} />);
    expect(spotlights(container)).toHaveLength(1);
    expect(container.querySelector('[data-vcard-media]')).toBeNull();
    fireEvent.click(screen.getByText('screens.autopilotdashboard.setGoalCta'));
    expect(onSetGoal).toHaveBeenCalled();
  });

  it('error without a goal: retry instead of a misleading "no goal" state', () => {
    const onRetry = vi.fn();
    wrap(<JourneyHero goal={null} journey={null} loading={false} error {...heroProps} onRetry={onRetry} />);
    fireEvent.click(screen.getByText('screens.autopilotdashboard.retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('goal: the goal, its real progress line and the plan action', () => {
    const onOpenPlan = vi.fn();
    const { container } = wrap(<JourneyHero goal={goal} journey={journey} loading={false} error={false} {...heroProps} onOpenPlan={onOpenPlan} />);
    expect(spotlights(container)).toHaveLength(1);
    expect(screen.getByText('Run a 10k')).toBeInTheDocument();
    expect(screen.getByText(/daysLeftCount/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('screens.autopilotdashboard.openPlan'));
    expect(onOpenPlan).toHaveBeenCalled();
  });

  it('progress label comes only from returned fields', () => {
    expect(journeyProgressLabel({ ...goal, has_deadline: false, days_to_deadline: null }, journey)).toMatch(/planDayOfTotal/);
    expect(journeyProgressLabel({ ...goal, has_deadline: false, days_to_deadline: null }, null)).toBeNull();
  });

  it('rail: compact cards only (SR-08), Autopilot opens on click', () => {
    const onOpen = vi.fn();
    const { container } = wrap(<JourneyRail pendingCount={3} onOpenAutopilot={onOpen} />);
    const sizes = [...container.querySelectorAll('[data-vcard-size]')].map((n) => n.getAttribute('data-vcard-size'));
    expect(sizes).toEqual(['compact', 'compact']);
    fireEvent.click(screen.getByText(/planStepsWaiting/));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('VTID-05117 Business Hub storefront', () => {
  beforeEach(() => {
    earningsLoading = false;
    earnings = { ...earnings, recentTransactions: [] };
    ledger.mockClear();
  });

  it('hero: one spotlight card with the real earnings', () => {
    const { container } = wrap(<BusinessHero onCreate={vi.fn()} />);
    expect(spotlights(container)).toHaveLength(1);
    expect(container.querySelector('[data-business-hero]')).not.toBeNull();
  });

  it('hero loading: skeleton', () => {
    earningsLoading = true;
    const { container } = wrap(<BusinessHero onCreate={vi.fn()} />);
    expect(container.querySelector('[data-vcard-skeleton]')).not.toBeNull();
  });

  it('overview: the ledger gets only real transactions — never the sample ledger', () => {
    wrap(<BusinessOverviewSpotlight onCreate={vi.fn()} onCreateService={vi.fn()} onCreateEvent={vi.fn()} onCreateCampaign={vi.fn()} />);
    expect(screen.getByTestId('ledger')).toHaveAttribute('data-count', '0');
    expect(ledger).toHaveBeenLastCalledWith([]);
  });
});

const product = {
  id: 'p1',
  title: 'Magnesium',
  brand: 'Acme',
  images: [],
  price_cents: 1990,
  compare_at_price_cents: null,
  currency: 'EUR',
  rating: null,
  description: 'Good for sleep',
  match_reasons: [{ text: 'Supports your sleep goal' }],
  ingredients_primary: ['magnesium_glycinate'],
  safety_notes: 'Ask your doctor',
} as unknown as MarketplaceProduct;

describe('VTID-05117 product detail body', () => {
  it('loading: the detail skeleton', () => {
    const { container } = wrap(<ProductDetailSpotlight data={undefined} isLoading error={null} recId={null} />);
    expect(container.querySelector('[data-archetype-skeleton="detail"]')).not.toBeNull();
  });

  it('not found: an empty state, no spotlight card', () => {
    const { container } = wrap(<ProductDetailSpotlight data={{ ok: false, error: 'not_found' }} isLoading={false} error={null} recId={null} />);
    expect(container.querySelector('[data-member-empty]')).not.toBeNull();
    expect(spotlights(container)).toHaveLength(0);
  });

  it('product: exactly one spotlight card and its real sections', () => {
    const { container } = wrap(<ProductDetailSpotlight data={{ ok: true, product }} isLoading={false} error={null} recId={null} />);
    expect(spotlights(container)).toHaveLength(1);
    expect(screen.getByText('Magnesium')).toBeInTheDocument();
    expect(screen.getByText('Supports your sleep goal')).toBeInTheDocument();
    expect(screen.getByText('magnesium glycinate')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Ask your doctor');
  });
});

describe('VTID-05117 shared states', () => {
  it('grid skeleton renders VCard skeletons, error offers a retry, empty is dashed', () => {
    const onRetry = vi.fn();
    const { container } = wrap(
      <>
        <SpotlightGridSkeleton count={4} />
        <SpotlightError onRetry={onRetry} />
        <SpotlightEmpty titleKey="x.title" />
      </>,
    );
    expect(container.querySelectorAll('[data-vcard-skeleton]')).toHaveLength(4);
    fireEvent.click(screen.getByText('spotlightMember.common.error.retry'));
    expect(onRetry).toHaveBeenCalled();
    expect(container.querySelectorAll('[data-member-empty]').length).toBeGreaterThan(0);
  });

  it('panel, notice and setting row use logical properties only', () => {
    const { container } = wrap(
      <>
        <SpotlightPanel title="T" description="D" actions={<button type="button">a</button>}>
          <SettingRow title="S" description="SD" control={<input aria-label="c" />} />
        </SpotlightPanel>
        <SpotlightNotice>n</SpotlightNotice>
      </>,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
    expect(html).not.toMatch(/\btext-(left|right)\b/);
    expect(screen.getByRole('note')).toHaveTextContent('n');
  });
});
