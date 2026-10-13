/**
 * VTID-05117 — Spotlight Phase 7.5: public, auth, legal, commerce-portal and
 * operator-placeholder screens on the Spotlight contract.
 *
 * Proves, without any network (Supabase, auth and the Spotlight switch are
 * mocked; nothing signs in, nothing is written):
 *  - flag off (useSpotlightEnabled() = false): a page renders today's tree —
 *    no [data-archetype], no Spotlight layout;
 *  - flag on: the page renders <ScreenFrame> with its manifest archetype
 *    (`form` for auth/legal, `detail` with exactly one spotlight VCard,
 *    `workspace`/`collection` for the shared coming-soon placeholder);
 *  - legal text is byte-identical with the flag on and off;
 *  - every page in this phase composes ScreenFrame behind useSpotlightEnabled()
 *    with the archetype its route has in src/design/screen-manifest.json.
 */
import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { Users } from 'lucide-react';

let spotlightOn = false;

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => spotlightOn }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
// The /patient/* placeholder carries a header (PatientComingSoonSpotlight, 7.5 part A); the real
// StandardHeader needs React Query, which this structural suite does not set up.
vi.mock('@/components/StandardHeader', () => ({ default: (p: { title: string }) => <header>{p.title}</header> }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ selectedLanguage: 'de-DE' }) }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null, loading: false, signOut: vi.fn(() => Promise.resolve()) }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));
vi.mock('@/components/crossover/NewsArticleCardMenu', () => ({ NewsArticleCardMenu: () => null }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ResetPassword from './auth/ResetPassword';
import Logout from './Logout';
import TermsOfUse from './legal/TermsOfUse';
import PrivacyPolicy from './legal/PrivacyPolicy';
import NewsArticleDetail from './NewsArticleDetail';
import InitEvents from './admin/InitEvents';
import { ComingSoonPlaceholder } from '@/components/patient/ComingSoonPlaceholder';

const at = (url: string, ui: React.ReactElement, routePath = '*') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={routePath} element={ui} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  spotlightOn = false;
});

describe('VTID-05117 flag off — today\'s trees, no Spotlight frame', () => {
  it.each([
    ['/reset-password', <ResetPassword key="r" />],
    ['/logout', <Logout key="l" />],
    ['/terms', <TermsOfUse key="t" />],
    ['/admin/init-events', <InitEvents key="i" />],
  ])('%s renders no [data-archetype]', (url, ui) => {
    const { container } = at(url, ui);
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-layout]')).toBeNull();
  });

  it('the coming-soon placeholder keeps its padded block inside AppLayout', () => {
    at('/staff/tasks', <ComingSoonPlaceholder icon={Users} titleKey="screens.common.dailyTasks" />);
    const shell = screen.getByTestId('app-layout');
    expect((shell.firstElementChild as HTMLElement).className).toBe('p-6');
    expect(shell.querySelector('[data-archetype]')).toBeNull();
  });
});

describe('VTID-05117 flag on — the manifest archetype', () => {
  beforeEach(() => {
    spotlightOn = true;
  });

  it('auth: /reset-password is a `form` screen (form column, no rail)', () => {
    const { container } = at('/reset-password', <ResetPassword />);
    const frame = container.querySelector('[data-archetype="form"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.querySelector('[data-spotlight-layout]')?.getAttribute('data-width')).toBe('form');
    expect(frame.querySelector('[data-spotlight-rail]')).toBeNull();
    expect(frame.querySelector('form')).not.toBeNull();
  });

  it('/logout is a `form` screen', () => {
    const { container } = at('/logout', <Logout />);
    expect(container.querySelector('[data-archetype="form"]')).not.toBeNull();
  });

  it('operator placeholders: `workspace` for staff/professional, `collection` for /patient/*', () => {
    const staff = at('/staff/tasks', <ComingSoonPlaceholder icon={Users} titleKey="screens.common.dailyTasks" />);
    expect(staff.container.querySelector('[data-archetype="workspace"] [data-spotlight-layout]')?.getAttribute('data-width')).toBe('full');
    staff.unmount();
    const patient = at('/patient/goals', <ComingSoonPlaceholder icon={Users} titleKey="screens.common.healthGoals" />);
    expect(patient.container.querySelector('[data-archetype="collection"]')).not.toBeNull();
  });

  it('/admin/init-events is a `workspace` screen', () => {
    const { container } = at('/admin/init-events', <InitEvents />);
    expect(container.querySelector('[data-archetype="workspace"]')).not.toBeNull();
  });

  it('/news/:id is a `detail` screen with exactly one spotlight card', () => {
    const article = {
      id: 'a1',
      title: 'Longevity basics',
      summary: 'Sleep, movement, food.',
      tags: [],
      source: 'news',
      source_name: 'Vitana',
      published_at: '2026-10-01T10:00:00Z',
      image_url: null,
      link: null,
    };
    const { container } = render(
      <MemoryRouter initialEntries={[{ pathname: '/news/a1', state: { article } }]}>
        <Routes>
          <Route path="/news/:id" element={<NewsArticleDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    const frame = container.querySelector('[data-archetype="detail"]') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(frame.querySelectorAll('[data-vcard-size="spotlight"]')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Longevity basics');
  });
});

describe('VTID-05117 legal text is unchanged by the Spotlight frame', () => {
  it.each([
    ['/terms', () => <TermsOfUse />],
    ['/privacy', () => <PrivacyPolicy />],
  ])('%s renders the same article text with the flag off and on', (url, Page) => {
    spotlightOn = false;
    const off = at(url, <Page />);
    const offText = off.container.querySelector('article')?.textContent ?? '';
    off.unmount();
    spotlightOn = true;
    const on = at(url, <Page />);
    expect(on.container.querySelector('[data-archetype="form"]')).not.toBeNull();
    const onText = on.container.querySelector('article')?.textContent ?? '';
    expect(offText.length).toBeGreaterThan(500);
    expect(onText).toBe(offText);
  });
});

describe('VTID-05117 every page of this phase composes ScreenFrame behind useSpotlightEnabled()', () => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'src/design/screen-manifest.json'), 'utf8')).screens as {
    path: string;
    archetype: string;
  }[];
  const archetypeOf = (route: string) => manifest.find((e) => e.path === route)?.archetype;

  // route → file that renders it (App.tsx). Redirect-only routes are not listed.
  const PAGES: [string, string][] = [
    ['/', 'src/pages/Index.tsx'],
    ['/_intro/:tenantSlug', 'src/pages/IntroExperience.tsx'],
    ['/alkalma', 'src/pages/portals/AlkalmaPortal.tsx'],
    ['/alkalma/confirmed', 'src/pages/portals/AlkalmaConfirmed.tsx'],
    ['/apply', 'src/pages/Apply.tsx'],
    ['/auth/confirmed', 'src/pages/auth/EmailConfirmed.tsx'],
    ['/commerce-login', 'src/pages/portals/CommercePortalLogin.tsx'],
    ['/invite', 'src/pages/InviteFriends.tsx'],
    ['/logout', 'src/pages/Logout.tsx'],
    ['/maxina', 'src/pages/portals/MaxinaPortal.tsx'],
    ['/maxina/app', 'src/pages/MaxinaAppRedirect.tsx'],
    ['/maxina/confirmed', 'src/pages/portals/MaxinaConfirmed.tsx'],
    ['/oauth/complete', 'src/pages/auth/OAuthComplete.tsx'],
    ['/oauth/consent', 'src/pages/OAuthConsent.tsx'],
    ['/onboarding/welcome', 'src/pages/onboarding/OnboardingWelcome.tsx'],
    ['/privacy', 'src/pages/legal/PrivacyPolicy.tsx'],
    ['/reset-password', 'src/pages/auth/ResetPassword.tsx'],
    ['/terms', 'src/pages/legal/TermsOfUse.tsx'],
    ['/commerce/invites/:token/accept', 'src/pages/CommerceAcceptInvite.tsx'],
    ['/checkout/success', 'src/pages/CheckoutSuccess.tsx'],
    ['/commerce', 'src/pages/CommercePortal.tsx'],
    ['/commerce/connect', 'src/pages/CommerceConnectDocs.tsx'],
    ['/commerce/connect/authorize', 'src/pages/CommerceConnectAuthorize.tsx'],
    ['/commerce/connect/privacy', 'src/pages/CommerceConnectPrivacy.tsx'],
    ['/commerce/health-orders', 'src/pages/CommerceHealthOrders.tsx'],
    ['/commerce/join', 'src/pages/CommerceJoin.tsx'],
    ['/commerce/team', 'src/pages/CommerceTeam.tsx'],
    ['/download', 'src/pages/DownloadFlyer.tsx'],
    ['/maxina_support', 'src/pages/legal/MaxinaSupport.tsx'],
    ['/packages/success', 'src/pages/PackagePurchaseSuccess.tsx'],
    ['/partner/connections', 'src/pages/PartnerConnections.tsx'],
    ['/universal-cart', 'src/pages/UniversalCart.tsx'],
    ['/e/:slug', 'src/pages/PublicEventLanding.tsx'],
    ['/news/:id', 'src/pages/NewsArticleDetail.tsx'],
    ['/partner/connections/:id', 'src/pages/PartnerConnectionDetail.tsx'],
    ['/pub/campaigns/:id', 'src/pages/PublicCampaignLanding.tsx'],
    ['/shop', 'src/pages/ShopFeed.tsx'],
    ['/admin/init-events', 'src/pages/admin/InitEvents.tsx'],
    ['/exafy-admin', 'src/pages/portals/ExafyAdminPortal.tsx'],
  ];

  // Decision (VTID-05117): the cinematic intro keeps its measured, full-bleed
  // Orb layout, which only the `immersive` frame preserves; the manifest now
  // says `immersive` too (integration), so no override is needed.
  const OVERRIDE: Record<string, string> = {};

  it.each(PAGES)('%s (%s) uses its archetype behind the switch', (route, file) => {
    const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
    const archetype = OVERRIDE[route] ?? archetypeOf(route);
    expect(archetype, `${route} is in the manifest`).toBeTruthy();
    expect(src).toContain('useSpotlightEnabled()');
    expect(src).toMatch(/ScreenFrame|FrameWhen|PublicMain/);
    expect(src).toContain(`archetype="${archetype}"`);
  });

  it('the shared coming-soon placeholder picks the archetype of the route it serves', () => {
    const src = fs.readFileSync(path.resolve(process.cwd(), 'src/components/patient/ComingSoonPlaceholder.tsx'), 'utf8');
    // Member /patient/* routes → PatientComingSoonSpotlight (`collection`, 7.5 part A); operator routes → `workspace`.
    expect(src).toContain("if (spotlight && pathname.startsWith('/patient')) return <PatientComingSoonSpotlight");
    expect(src).toContain('<ScreenFrame archetype="workspace">');
    const patientSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/components/spotlight/member/PatientSpotlight.tsx'), 'utf8');
    expect(patientSrc).toContain('<ScreenFrame archetype="collection"');
    for (const r of ['/professional/schedule', '/professional/tools', '/staff/tasks', '/staff/time']) expect(archetypeOf(r)).toBe('workspace');
    for (const r of ['/patient/goals', '/patient/insurance']) expect(archetypeOf(r)).toBe('collection');
  });

  it('no page of this phase imports the raw shadcn Card except the cart (its lines move to VCard in Phase 6)', () => {
    for (const [, file] of PAGES) {
      const src = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      if (file.endsWith('UniversalCart.tsx')) continue;
      expect(src, file).not.toContain("from '@/components/ui/card'");
      expect(src, file).not.toContain('from "@/components/ui/card"');
    }
  });
});
