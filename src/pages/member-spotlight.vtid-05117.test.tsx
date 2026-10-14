/**
 * VTID-05117 — Phase 7.5 member screens switch on `useSpotlightEnabled()`:
 * flag off → the legacy screen (no `data-archetype`), flag on → the
 * `ScreenFrame` of the archetype in src/design/screen-manifest.json, with the
 * legacy sample content left out (SR-24). Everything is mocked — no network,
 * no Supabase.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

let spotlightOn = false;
vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: vi.fn(() => ({ insert: vi.fn(), select: vi.fn() })),
  },
}));
vi.mock('@/lib/i18n-toast', async (orig) => ({
  ...(await orig<typeof import('@/lib/i18n-toast')>()),
  t: (k: string) => k,
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ translate: (k: string) => k }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/components/SubNavigation', () => ({ default: () => <nav data-testid="subnav" /> }));
vi.mock('@/components/StandardHeader', () => ({
  default: (p: { title: string; density?: string }) => <header data-testid="header" data-density={p.density ?? 'default'}>{p.title}</header>,
}));
vi.mock('@/components/ui/utility-action-button', () => ({
  UtilityActionButton: (p: { children?: ReactNode }) => <div data-testid="utility">{p.children}</div>,
}));
vi.mock('@/components/UniversalCalendarButton', () => ({ UniversalCalendarButton: () => null }));
vi.mock('@/components/MotivationalBanner', () => ({ MotivationalBanner: () => null }));
vi.mock('@/components/crossover/NewsCard', () => ({ NewsCard: (p: { title: string }) => <div data-testid="sample-card">{p.title}</div> }));
vi.mock('@/components/memory/RecallMasterActionPopup', () => ({ RecallMasterActionPopup: () => null }));
vi.mock('@/components/memory/PermissionsMasterActionPopup', () => ({ PermissionsMasterActionPopup: () => null }));
vi.mock('@/components/messages/InspirationMasterActionPopup', () => ({ InspirationMasterActionPopup: () => null }));
vi.mock('@/components/sharing/AutomationRuleDialog', () => ({ AutomationRuleDialog: () => null }));
vi.mock('@/components/sharing/TemplateDialog', () => ({ TemplateDialog: () => null }));
vi.mock('@/components/sharing/BrandGuidelineDialog', () => ({ BrandGuidelineDialog: () => null }));
vi.mock('@/components/payment/BookingPaymentFlow', () => ({ default: () => null }));
vi.mock('@/components/bookmarks/BookmarkButton', () => ({ BookmarkButton: () => null }));
vi.mock('@/hooks/useWallet', () => ({ useWallet: () => ({ getBalance: vi.fn() }) }));
vi.mock('@/components/ui/horizontal-card-list', () => ({ HorizontalCardList: () => <div data-testid="sample-card" /> }));
vi.mock('@/hooks/useShareOrCopy', () => ({ useShareOrCopy: () => ({ shareOrCopy: vi.fn() }) }));

import Recall from './memory/Recall';
import Permissions from './memory/Permissions';
import Archived from './messages/Archived';
import Inspiration from './messages/Inspiration';
import Distribution from './sharing/Distribution';
import ProviderProfile from './discover/ProviderProfile';
import PatientHealth from './patient/Health';
import PatientAppointments from './patient/Appointments';

function renderAt(ui: ReactNode, path = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const cases: { name: string; ui: () => ReactNode; path?: string; archetype: string; sample?: string; legacyHeader?: false }[] = [
  { name: '/memory/recall', ui: () => <Recall />, archetype: 'collection', sample: 'sample-card' },
  { name: '/memory/permissions', ui: () => <Permissions />, archetype: 'collection', sample: 'sample-card' },
  { name: '/inbox/archived', ui: () => <Archived />, archetype: 'conversation' },
  { name: '/inbox/inspiration', ui: () => <Inspiration />, archetype: 'conversation' },
  { name: '/sharing/distribution', ui: () => <Distribution />, archetype: 'collection', sample: 'sample-card' },
  { name: '/patient/health', ui: () => <PatientHealth />, archetype: 'collection', legacyHeader: false },
  { name: '/patient/appointments', ui: () => <PatientAppointments />, archetype: 'collection', legacyHeader: false },
];

describe('VTID-05117 member screens — Spotlight switch', () => {
  beforeEach(() => {
    spotlightOn = false;
  });

  for (const c of cases) {
    it(`${c.name}: flag off keeps the legacy screen`, () => {
      const { container } = renderAt(c.ui(), c.path);
      expect(container.querySelector('[data-archetype]')).toBeNull();
      if (c.legacyHeader === false) expect(screen.queryByTestId('header')).toBeNull();
      else expect(screen.getByTestId('header')).toHaveAttribute('data-density', 'default');
    });

    it(`${c.name}: flag on renders the ${c.archetype} frame with the compact header`, () => {
      spotlightOn = true;
      const { container } = renderAt(c.ui(), c.path);
      expect(container.querySelector(`[data-archetype="${c.archetype}"]`)).not.toBeNull();
      expect(screen.getByTestId('header')).toHaveAttribute('data-density', 'compact');
      expect(container.querySelector('.animate-spin')).toBeNull();
      if (c.sample) expect(screen.queryAllByTestId(c.sample)).toHaveLength(0);
    });
  }

  it('/memory/recall and /memory/permissions: the sample cards exist only on the legacy screen', () => {
    renderAt(<Recall />);
    expect(screen.getAllByTestId('sample-card').length).toBeGreaterThan(0);
  });

  it('/inbox/archived: no sample conversations on Spotlight, an honest empty state instead', () => {
    spotlightOn = true;
    const { container } = renderAt(<Archived />);
    expect(screen.queryByText('Dr. Johnson')).toBeNull();
    expect(container.querySelector('[data-member-empty]')).not.toBeNull();
  });

  it('/inbox/inspiration: templates are row cards with a Copy action and no dead Send', () => {
    spotlightOn = true;
    const { container } = renderAt(<Inspiration />);
    expect(container.querySelectorAll('[data-vcard-size="row"]').length).toBeGreaterThan(0);
    expect(screen.getAllByText('screens.messages.copy').length).toBeGreaterThan(0);
    expect(screen.queryByText('screens.messages.send')).toBeNull();
  });

  it('/discover/provider/:id: detail frame with exactly one (text-only) spotlight card, no sample provider', () => {
    spotlightOn = true;
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/discover/provider/1']}>
          <ProviderProfile />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(container.querySelector('[data-archetype="detail"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.queryByText('Dr. Sarah Chen')).toBeNull();
  });
});
