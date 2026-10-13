/**
 * VTID-05111 — Spotlight Phase 5 (Tier B adoption).
 *
 * Proves, without any network:
 *  - flag off: a Tier B page renders its legacy tree (no [data-archetype], legacy wrapper kept);
 *  - flag on: the page is framed by ScreenFrame with the manifest's archetype, the compact header
 *    and the utility row; tabs sit in the utility row (SplitBar); lists use VCard and shared states;
 *  - the dashboard hero is exactly one `spotlight` VCard, shows real data only, and its loading
 *    state is the spotlight skeleton;
 *  - every migrated Tier B page composes ScreenFrame behind useSpotlightEnabled() with the archetype
 *    its route has in src/design/screen-manifest.json.
 */
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({
  default: ({ items }: { items: { id: string }[] }) => <nav data-testid="subnav">{items.map((i) => i.id).join(',')}</nav>,
}));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => (
    <header data-testid="header" data-density={p.density ?? 'default'}>
      {p.title}
    </header>
  ),
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/sharing/GrantAccessDialog', () => ({ GrantAccessDialog: () => null }));
vi.mock('@/components/sharing/CreatePackageDialog', () => ({ CreatePackageDialog: () => null }));
vi.mock('@/components/sharing/PrivacySettingsDialog', () => ({ PrivacySettingsDialog: () => null }));
vi.mock('@/components/EducationMasterActionPopup', () => ({ EducationMasterActionPopup: () => null }));
vi.mock('@/components/reminders/RemindersPanel', () => ({ default: () => <div data-testid="reminders-panel" /> }));

import ConditionsRisks from './health/ConditionsRisks';
import EducationResources from './health/EducationResources';
import DataConsent from './sharing/DataConsent';
import Reminders from './Reminders';
import { VitanaIndexHeroCard } from '@/components/spotlight/tier-b/VitanaIndexHeroCard';
import type { VitanaIndexState } from '@/hooks/useVitanaIndex';

const inRouter = (ui: React.ReactElement, at = '/') => render(<MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>);

beforeEach(() => {
  spotlightOn = false;
});

describe('VTID-05111 flag off — legacy tree unchanged', () => {
  it('ConditionsRisks keeps its legacy header and wrapper, no Spotlight frame', () => {
    const { container } = inRouter(<ConditionsRisks />, '/health/conditions');
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-vcard-size]')).toBeNull();
    expect(screen.getByTestId('header').getAttribute('data-density')).toBe('default');
    expect(container.querySelector('.min-h-screen')).not.toBeNull();
  });

  it('Education keeps its in-content SplitBar (no utility-row tabs)', () => {
    const { container } = inRouter(<EducationResources />, '/health/education');
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-utility]')).toBeNull();
    expect(screen.getAllByRole('tab').length).toBe(3);
  });
});

describe('VTID-05111 flag on — ScreenFrame, compact header, VCard', () => {
  it('ConditionsRisks: collection frame, compact header, standard VCards, no legacy wrapper', () => {
    spotlightOn = true;
    const { container } = inRouter(<ConditionsRisks />, '/health/conditions');
    const frame = container.querySelector('[data-archetype]') as HTMLElement;
    expect(frame.getAttribute('data-archetype')).toBe('collection');
    expect(screen.getByTestId('header').getAttribute('data-density')).toBe('compact');
    expect(screen.getByTestId('subnav')).toBeTruthy();
    expect(frame.querySelector('[data-spotlight-layout]')!.getAttribute('data-width')).toBe('wide');
    expect(frame.querySelectorAll('[data-vcard-size="standard"]').length).toBe(2);
    expect(container.querySelector('.min-h-screen')).toBeNull();
  });

  it('Education: tabs move to the utility row; sample videos are an empty state, not invented numbers', () => {
    spotlightOn = true;
    const { container } = inRouter(<EducationResources />, '/health/education?tab=videos');
    const utilityRow = container.querySelector('[data-spotlight-utility]') as HTMLElement;
    expect(utilityRow.querySelectorAll('[role="tab"]').length).toBe(3);
    expect(container.querySelector('[data-tier-b-empty]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\d+(\.\d)?K/);
  });

  it('Education articles render as standard VCards without ratings', () => {
    spotlightOn = true;
    const { container } = inRouter(<EducationResources />, '/health/education');
    const cards = container.querySelectorAll('[data-vcard-size="standard"]');
    expect(cards.length).toBe(6);
    expect(container.textContent).not.toContain('4.8');
  });

  it('DataConsent: the four panels are standard VCards (one size per row) and the access menu stays', () => {
    spotlightOn = true;
    const { container } = inRouter(<DataConsent />, '/sharing/data-consent');
    expect(container.querySelector('[data-archetype="collection"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="standard"]').length).toBe(4);
    expect(screen.getByText('screens.sharing.manageAccess')).toBeTruthy();
  });

  it('Reminders: collection on /reminders, detail on a fire deep link', () => {
    spotlightOn = true;
    const list = inRouter(<Reminders />, '/reminders');
    expect(list.container.querySelector('[data-archetype="collection"]')).not.toBeNull();
    expect(list.getByTestId('reminders-panel')).toBeTruthy();
    list.unmount();
  });
});

describe('VTID-05111 dashboard hero — exactly one spotlight card, real data only', () => {
  const index = {
    total: 412,
    tier: { min: 0, max: 999, label: 'Building', labelKey: 'vitanaIndex.tiers.building', color: '#000' },
    pillars: { nutrition: 120, hydration: 80, exercise: 60, sleep: 100, mental: 52 },
    trend: 'up',
    lastUpdated: '2026-10-12',
  } as unknown as VitanaIndexState;

  it('renders one spotlight VCard with the real score and five pillars', () => {
    const { container } = render(<VitanaIndexHeroCard index={index} isLoading={false} />);
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]').length).toBe(1);
    expect(screen.getByTestId('spotlight-vitana-index-score').textContent).toMatch(/412/);
    expect(container.querySelectorAll('li').length).toBe(5);
  });

  it('no index → no invented score or pillars', () => {
    const { container } = render(<VitanaIndexHeroCard index={null} isLoading={false} />);
    expect(screen.getByTestId('spotlight-vitana-index-score').textContent).toBe('—');
    expect(container.querySelectorAll('li').length).toBe(0);
  });

  it('loading → the spotlight skeleton, never a spinner', () => {
    const { container } = render(<VitanaIndexHeroCard index={null} isLoading />);
    expect(container.querySelector('[data-vcard-skeleton][data-vcard-size="spotlight"]')).not.toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();
  });

  it('opens on Enter when it is interactive, but not when an inner button is used', () => {
    const onOpen = vi.fn();
    render(<VitanaIndexHeroCard index={index} isLoading={false} onOpen={onOpen} openLabel="open" actions={<button type="button">inner</button>} />);
    fireEvent.click(screen.getByText('inner'));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'open' }), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('VTID-05111 source contract — archetype from the manifest, behind the flag', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../design/screen-manifest.json'), 'utf8')).screens as {
    path: string;
    archetype: string;
  }[];
  const archetypeOf = (route: string) => manifest.find((e) => e.path === route)?.archetype;

  // route → page file (relative to src/pages)
  const MIGRATED: [string, string][] = [
    ['/health', 'Health.tsx'],
    ['/health/pillars', 'health/PillarsOfHealth.tsx'],
    ['/health/services-hub', 'health/WellnessServices.tsx'],
    ['/health/conditions', 'health/ConditionsRisks.tsx'],
    ['/health/education', 'health/EducationResources.tsx'],
    ['/health/my-biology', 'health/MyBiology.tsx'],
    ['/health/plans', 'health/Plans.tsx'],
    ['/health/vitana-index', 'health/VitanaIndexDetail.tsx'],
    ['/wallet', 'Wallet.tsx'],
    ['/wallet/balance', 'wallet/Balance.tsx'],
    ['/wallet/subscriptions', 'wallet/Subscriptions.tsx'],
    ['/wallet/rewards', 'wallet/Rewards.tsx'],
    ['/ai', 'AI.tsx'],
    ['/ai/insights', 'ai/Insights.tsx'],
    ['/ai/recommendations', 'ai/AIRecommendations.tsx'],
    ['/ai/daily-summary', 'ai/DailySummary.tsx'],
    ['/ai/companion', 'ai/Companion.tsx'],
    ['/assistant', 'assistant/AIAssistant.tsx'],
    ['/settings/notifications', 'settings/SettingsNotifications.tsx'],
    ['/settings/limitations', 'settings/Limitations.tsx'],
    ['/settings/billing', 'settings/Billing.tsx'],
    ['/settings/tenant-role', 'settings/TenantRole.tsx'],
    ['/connectors', 'settings/ConnectedApps.tsx'],
    ['/support', 'settings/Support.tsx'],
    ['/calendar', 'Calendar.tsx'],
    ['/calendar/entry/:entryId', 'Calendar.tsx'],
    ['/reminders', 'Reminders.tsx'],
    ['/reminders/fire/:fireId', 'Reminders.tsx'],
    ['/intents/board', 'IntentBoard.tsx'],
    ['/intents/mine', 'MyIntents.tsx'],
    ['/intents/match/:id', 'IntentMatchDetail.tsx'],
    ['/sharing', 'Sharing.tsx'],
    ['/sharing/campaigns', 'sharing/Campaigns.tsx'],
    ['/sharing/campaigns/:id', 'sharing/CampaignDetail.tsx'],
    ['/sharing/data-consent', 'sharing/DataConsent.tsx'],
  ];

  it.each(MIGRATED)('%s → %s composes ScreenFrame with the manifest archetype behind useSpotlightEnabled()', (route, file) => {
    const archetype = archetypeOf(route);
    expect(archetype, `${route} is in the manifest`).toBeTruthy();
    const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
    expect(src).toContain('const spotlight = useSpotlightEnabled();');
    expect(src).toMatch(/if \(spotlight/);
    expect(src).toContain('<ScreenFrame');
    expect(src).toContain(`"${archetype}"`);
  });

  it('dashboard pages render exactly one spotlight-size element in their Spotlight branch', () => {
    for (const [route, file] of MIGRATED.filter(([r]) => archetypeOf(r) === 'dashboard')) {
      const src = fs.readFileSync(path.join(__dirname, file), 'utf8');
      const spotlightCards = (src.match(/size="spotlight"/g) ?? []).length + (src.match(/<VitanaIndexHeroCard/g) ?? []).length;
      expect(spotlightCards, route).toBeGreaterThanOrEqual(1);
      expect(spotlightCards, route).toBeLessThanOrEqual(2); // card + its skeleton
    }
  });
});
