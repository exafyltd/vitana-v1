/**
 * desktop-spotlight-finish / public-profile — `/u/:identifier` while the profile
 * loads (owner decision 3, no layout shift): on desktop Spotlight the loading
 * `detail` frame carries the same rail column as the loaded frame (5 compact
 * skeletons, one per stat card), so the stage does not move when data lands.
 * The profile request never resolves, so the page stays in its loading state.
 */
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ spotlight: true }));

vi.mock('@/hooks/useSpotlightEnabled', () => ({ useSpotlightEnabled: () => env.spotlight }));
vi.mock('@/lib/i18n-toast', () => ({ t: (k: string) => k, notify: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/components/AppLayout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/integrations/supabase/client', () => {
  // Every query stays pending: the page never leaves its loading state.
  const pending = () => new Promise(() => {});
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ['rpc', 'from', 'select', 'eq', 'in', 'order', 'limit', 'maybeSingle', 'single']) chain[m] = self;
  chain.abortSignal = pending;
  chain.then = (resolve: unknown, reject: unknown) => pending().then(resolve as never, reject as never);
  return { supabase: chain };
});
vi.mock('@/components/profile/shared/ProfileLayout', () => ({ ProfileLayout: () => null }));
vi.mock('@/components/profile/sections/DancePublicSection', () => ({ DancePublicSection: () => null }));
vi.mock('@/components/profile/sections/PartnerPreferencesPublicSection', () => ({ PartnerPreferencesPublicSection: () => null }));
vi.mock('@/components/profile/sections/ServiceOfferingsPublicSection', () => ({ ServiceOfferingsPublicSection: () => null }));
vi.mock('@/components/profile/sections/MyPostsSection', () => ({ MyPostsSection: () => null }));
vi.mock('@/components/profile/public/PublicProfileLanding', () => ({ PublicProfileLanding: () => null }));
vi.mock('@/components/community/WhyThisMatchCard', () => ({ WhyThisMatchCard: () => null }));
vi.mock('@/components/profile/shared/ProfileSpotlightRail', async (orig) => {
  const actual = await orig<typeof import('./shared/ProfileSpotlightRail')>();
  return { ...actual, ProfileSpotlightRail: () => null };
});

import PublicProfilePage from '@/pages/PublicProfilePage';
import { PROFILE_SPOTLIGHT_RAIL_STATS } from './shared/ProfileSpotlightRail';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/u/demo']}>
      <Routes>
        <Route path="/u/:identifier" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('PublicProfilePage — loading frame', () => {
  beforeEach(() => {
    env.spotlight = true;
  });

  it('desktop Spotlight: the loading detail frame has the rail column with one compact skeleton per stat card', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype="detail"]')).not.toBeNull();
    expect(container.querySelector('[data-spotlight-loading="desktop"]')).not.toBeNull();
    const rail = container.querySelector('[data-spotlight-rail]');
    expect(rail).not.toBeNull();
    expect(rail!.querySelectorAll('[data-vcard-skeleton][data-vcard-size="compact"]')).toHaveLength(PROFILE_SPOTLIGHT_RAIL_STATS);
  });

  it('phones / flag off: no frame, no rail, the single-column skeleton', () => {
    env.spotlight = false;
    const { container } = renderPage();
    expect(container.querySelector('[data-archetype]')).toBeNull();
    expect(container.querySelector('[data-spotlight-rail]')).toBeNull();
    expect(container.querySelector('[data-spotlight-loading="mobile"]')).not.toBeNull();
  });
});
