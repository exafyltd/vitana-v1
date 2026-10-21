/**
 * VTID-05212 (plan profile-vitana-cards, lane card-actions, R6) — every Vitana
 * card's button leads somewhere the member can do what the card promises:
 *
 *   C1 G1 "Complete your profile" opens the first open profile step (and on
 *      /me/profile itself opens that editor), from the cached profile list.
 *   C2 F4 "Ask Vitana" opens the ORB; the Talk to Vitana page is the fallback.
 *   C4 F8 "Did you know" never stays disabled when the tip has no destination.
 *   C6 every navigating card works the same inside a chat (VitanaChatCard).
 *
 * C3 (Connectors anchors) and C5 (Instagram/Facebook in Appilix) have their
 * own files: useHashScroll / ConnectedApps.anchors and useStartSocialOAuth.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentType, ReactNode } from 'react';
import type { VitanaCardProps } from './card-props';

const h = vi.hoisted(() => ({
  orb: vi.fn(() => false),
  accept: vi.fn<() => string | null>(() => null),
  decline: vi.fn(),
}));

vi.mock('@/lib/orbActivate', () => ({ activateOrb: () => h.orb() }));
vi.mock('@/hooks/useDidYouKnowTip', () => ({
  useDidYouKnowTip: () => ({
    tip: { tip_key: 'k', feature_key: 'f', voice_on_nav: '', card_copy: 'Tip text', cta_label: 'Zeig es mir', cta_url: '' },
    accept: h.accept,
    decline: h.decline,
  }),
}));
vi.mock('@/hooks/useCardDismiss', () => ({ useCardDismiss: () => ({ isDismissed: false, dismiss: vi.fn() }) }));
vi.mock('@/hooks/useEnrichmentCards', async (orig) => ({
  ...(await orig<typeof import('@/hooks/useEnrichmentCards')>()),
  useInvalidateEnrichmentCards: () => vi.fn(),
  useEnrichmentCardDismiss: () => vi.fn(),
}));
vi.mock('@/hooks/useGoogleConnect', () => ({
  useStartInstagramConnect: () => ({ mutate: vi.fn(), isPending: false }),
  useStartFacebookConnect: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

import { VITANA_CARD_REGISTRY } from './card-registry';
import { VitanaChatCard } from './VitanaChatCard';
import { CARD_DEEP_LINKS, type VitanaCardType } from './vitana-card-catalog';
import { enrichmentCardsKey, type EnrichmentCardsPayload } from '@/hooks/useEnrichmentCards';
import { useProfileEditorDeepLink } from '@/hooks/useProfileEditorDeepLink';
import { firstOpenProfileStep, G1_FALLBACK_LINK } from '@/components/enrichment/CompleteProfileCard';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search + loc.hash}</div>;
}

const profileCards = (...types: VitanaCardType[]): EnrichmentCardsPayload => ({
  cards: types.map((t, i) => ({ card_type: t, category: t.startsWith('G') ? 'boost' : 'enrichment', priority: i + 1, title: t, description: '' })),
  profile_completion_pct: 40,
});

function harness(ui: ReactNode, { cache, at = '/home' }: { cache?: EnrichmentCardsPayload; at?: string } = {}) {
  const qc = new QueryClient();
  if (cache) qc.setQueryData([...enrichmentCardsKey('user-1'), 'profile'], cache);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path={at.split('#')[0].split('?')[0]} element={ui} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const Card = (type: VitanaCardType) => VITANA_CARD_REGISTRY[type] as ComponentType<VitanaCardProps>;
const action = (type: VitanaCardType) => screen.getByTestId(`vitana-card-action-${type}`);

beforeEach(() => {
  h.orb.mockReset().mockReturnValue(false);
  h.accept.mockReset().mockReturnValue(null);
  h.decline.mockReset();
});

describe('C1 — G1 opens the first open profile step', () => {
  it('picks the first open card with a profile editor, in server order (E3/E6/E7 have none)', () => {
    expect(firstOpenProfileStep(profileCards('E3', 'E6', 'E4', 'E2', 'G1'))).toBe('/me/profile#interests');
    expect(firstOpenProfileStep(profileCards('E1', 'E2'))).toBe('/me/profile#avatar');
    expect(firstOpenProfileStep(profileCards('E11'))).toBe('/me/profile#cover');
  });

  it('falls back to the About editor when the list is not cached, or no open card has an editor', () => {
    expect(firstOpenProfileStep(undefined)).toBe(G1_FALLBACK_LINK);
    expect(firstOpenProfileStep(profileCards('E3', 'E6', 'E7', 'G1'))).toBe(G1_FALLBACK_LINK);
    expect(G1_FALLBACK_LINK).toBe('/me/profile#about');
  });

  it('from Home: the button goes to the first open step from the cached profile list', () => {
    const G1 = Card('G1');
    harness(<G1 />, { cache: profileCards('E3', 'E5', 'E1') });
    fireEvent.click(action('G1'));
    expect(screen.getByTestId('where').textContent).toBe('/me/profile#location');
  });

  it('from Home with nothing cached: the About editor (never a bare /me/profile)', () => {
    const G1 = Card('G1');
    harness(<G1 />);
    fireEvent.click(action('G1'));
    expect(screen.getByTestId('where').textContent).toBe('/me/profile#about');
  });

  it('on /me/profile itself: the tap opens that editor (the bug: it used to do nothing)', () => {
    const opened: string[] = [];
    function ProfilePage() {
      useProfileEditorDeepLink({
        avatar: () => opened.push('avatar'),
        about: () => opened.push('about'),
        location: () => opened.push('location'),
        cover: () => opened.push('cover'),
        interests: () => opened.push('interests'),
      });
      const G1 = Card('G1');
      return <G1 />;
    }
    harness(<ProfilePage />, { at: '/me/profile', cache: profileCards('E4', 'E2') });
    fireEvent.click(action('G1'));
    expect(opened).toEqual(['interests']);
    // The hash is consumed, so a second tap opens it again.
    fireEvent.click(action('G1'));
    expect(opened).toEqual(['interests', 'interests']);
  });
});

describe('C2 — F4 "Ask Vitana" opens a conversation with Vitana', () => {
  it('opens the ORB and stays on the page', () => {
    h.orb.mockReturnValue(true);
    const F4 = Card('F4');
    harness(<F4 />);
    fireEvent.click(action('F4'));
    expect(h.orb).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('without the ORB widget: the Talk to Vitana page, not the assistant settings page', () => {
    const F4 = Card('F4');
    harness(<F4 />);
    fireEvent.click(action('F4'));
    expect(screen.getByTestId('where').textContent).toBe('/comm/talk-to-vitana');
    expect(CARD_DEEP_LINKS.F4).toBe('/comm/talk-to-vitana');
  });

  it('inside a chat: same ORB-first behaviour (one component for every surface)', () => {
    h.orb.mockReturnValue(true);
    harness(<VitanaChatCard card_type="F4" dismissible={false} />);
    fireEvent.click(action('F4'));
    expect(h.orb).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('where')).toBeNull();
  });
});

describe('C4 — F8 "Did you know" never freezes', () => {
  it('a tip without a destination: the button is enabled again, nothing navigates, no extra decline', () => {
    const F8 = Card('F8');
    harness(<F8 onDismiss={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Zeig es mir' });
    fireEvent.click(btn);
    expect(h.accept).toHaveBeenCalledTimes(1);
    expect(btn).not.toBeDisabled();
    expect(screen.queryByTestId('where')).toBeNull();
    expect(h.decline).not.toHaveBeenCalled();
    // A second tap is accepted again (it used to be swallowed by `busy`).
    fireEvent.click(btn);
    expect(h.accept).toHaveBeenCalledTimes(2);
  });

  it('a tip with a destination still navigates there', () => {
    h.accept.mockReturnValue('/discover');
    const F8 = Card('F8');
    harness(<F8 />);
    fireEvent.click(screen.getByRole('button', { name: 'Zeig es mir' }));
    expect(screen.getByTestId('where').textContent).toBe('/discover');
  });
});

describe('C6 — every navigating card works inside a chat too', () => {
  const NAVIGATING: VitanaCardType[] = ['E1', 'E2', 'E5', 'E8', 'E9', 'E11', 'F3', 'F4', 'F5', 'F6', 'F9', 'F11', 'G2', 'G3'];

  it.each(NAVIGATING)('%s in a chat bubble goes to its deep link', (type) => {
    harness(<VitanaChatCard card_type={type} dismissible={false} />);
    fireEvent.click(action(type));
    expect(screen.getByTestId('where').textContent).toBe(CARD_DEEP_LINKS[type]);
  });

  it('G1 in a chat bubble opens a profile editor', () => {
    harness(<VitanaChatCard card_type="G1" dismissible={false} />);
    fireEvent.click(action('G1'));
    expect(screen.getByTestId('where').textContent).toBe(G1_FALLBACK_LINK);
  });

  it('E8 and E9 land on the Mail, Calendar & Contacts section of Connectors', () => {
    expect(CARD_DEEP_LINKS.E8).toBe('/connectors?tab=productivity#calendar');
    expect(CARD_DEEP_LINKS.E9).toBe('/connectors?tab=productivity#contacts');
  });
});
