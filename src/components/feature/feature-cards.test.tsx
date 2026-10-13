/**
 * VTID-05086 — the new feature cards (F3, F4, F5, F6, F9, F10, F11), the
 * restyled existing ones (F1, F2, F7, F8 + the "Did you know" feature card)
 * and the per-screen lists (plan §4).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import type { VitanaCardProps } from '@/components/vitana/card-props';

const h = vi.hoisted(() => ({
  shareInvite: vi.fn(),
  accept: vi.fn(() => '/discover'),
  decline: vi.fn(),
  audiobook: null as null | { start: ReturnType<typeof vi.fn> },
  index: { total: 512, trend: 'up' as const, history: [{ score: 400 }, { score: 512 }] },
  journey: { totalSessions: 10, completedInOrder: 2, nextSession: { session: 3 }, completedToday: 0, dailyGoal: 1, loading: false },
}));

vi.mock('@/hooks/useVitanaIndex', () => ({ useVitanaIndex: () => ({ index: h.index, isLoading: false }) }));
vi.mock('@/hooks/useGuidedJourneyProgress', () => ({ useGuidedJourneyProgress: () => h.journey }));
vi.mock('@/context/AudiobookPlayerProvider', () => ({ useAudiobookPlayer: () => h.audiobook }));
vi.mock('@/hooks/useInviteFriendShare', () => ({ useInviteFriendShare: () => ({ shareInvite: h.shareInvite }) }));
vi.mock('@/hooks/useDidYouKnowTip', () => ({
  useDidYouKnowTip: () => ({
    tip: { tip_key: 'k', feature_key: 'f', voice_on_nav: '', card_copy: 'Tip text', cta_label: 'Zeig es mir', cta_url: '/discover' },
    accept: h.accept,
    decline: h.decline,
  }),
}));
vi.mock('@/hooks/useEnrichmentCards', () => ({ useInvalidateEnrichmentCards: () => vi.fn(), useEnrichmentCardDismiss: () => vi.fn() }));
vi.mock('@/hooks/useGoogleConnect', () => ({
  useStartInstagramConnect: () => ({ mutate: vi.fn(), isPending: false }),
  useStartFacebookConnect: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/components/CreateContentPopup', () => ({
  CreateContentPopup: ({ isOpen, initialType }: { isOpen: boolean; initialType?: string }) =>
    isOpen ? <div data-testid="composer-desktop">{initialType}</div> : null,
}));
vi.mock('@/components/profile/mobile/MobileCreatePostSheet', () => ({
  MobileCreatePostSheet: ({ open, pickMediaOnOpen }: { open: boolean; pickMediaOnOpen?: boolean }) =>
    open ? <div data-testid="composer-mobile">{String(pickMediaOnOpen)}</div> : null,
}));

import { VITANA_CARD_REGISTRY } from '@/components/vitana/card-registry';
import { CARD_DEEP_LINKS, CARD_SCREENS, FEATURE_CARD_TYPES, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';
import { CreatePostLauncherProvider } from '@/components/vitana/create-post-launcher';
import { VITANA_INDEX_OPEN_EVENT } from '@/components/health/VitanaIndexSheet';
import { FeatureAnnouncementCard } from '@/components/home/FeatureAnnouncementCard';
import { splitTipCopy } from '@/components/proactive/split-tip-copy';
import de from '@/i18n/de/screens.json';

const deCards = (de as unknown as { screens: { vitanaCards: Record<string, { title: string; action: string }> } }).screens.vitanaCards;
const deId = (de as unknown as { screens: { vitanaIdentity: Record<string, string> } }).screens.vitanaIdentity;

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.hash}</div>;
}

function renderCard(type: VitanaCardType, props: VitanaCardProps = {}) {
  const Card = VITANA_CARD_REGISTRY[type] as ComponentType<VitanaCardProps>;
  return render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<Card {...props} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.shareInvite.mockReset();
  h.accept.mockClear();
  h.decline.mockReset();
  h.audiobook = null;
});

describe('feature cards F1–F11', () => {
  it('every feature card type has a component in the one registry', () => {
    for (const type of FEATURE_CARD_TYPES) expect(VITANA_CARD_REGISTRY[type], type).toBeTruthy();
  });

  it.each(['F3', 'F4', 'F5', 'F6', 'F9', 'F11'] as const)('%s renders its German copy and its button navigates to its deep link', (type) => {
    renderCard(type, { onDismiss: () => {} });
    expect(screen.getByText(deCards[type].title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: deCards[type].action }));
    expect(screen.getByTestId('where').textContent).toBe(CARD_DEEP_LINKS[type]);
  });

  it.each(['F3', 'F4', 'F5', 'F6', 'F9', 'F10', 'F11'] as const)('%s: X calls onDismiss; no onDismiss → no X', (type) => {
    const onDismiss = vi.fn();
    const { unmount } = renderCard(type, { onDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'Karte ausblenden' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();
    renderCard(type);
    expect(screen.queryByRole('button', { name: 'Karte ausblenden' })).toBeNull();
  });

  it('F10 opens the existing composer in media mode', () => {
    renderCard('F10');
    fireEvent.click(screen.getByRole('button', { name: deCards.F10.action }));
    expect(screen.getByTestId('composer-desktop').textContent).toBe('media');
  });

  it('F10 inside the composer (Make a Post) switches that composer instead of opening a second one', () => {
    const host = vi.fn();
    const Card = VITANA_CARD_REGISTRY.F10 as ComponentType<VitanaCardProps>;
    render(
      <MemoryRouter>
        <CreatePostLauncherProvider open={host}>
          <Card />
        </CreatePostLauncherProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: deCards.F10.action }));
    expect(host).toHaveBeenCalledWith('media');
    expect(screen.queryByTestId('composer-desktop')).toBeNull();
  });
});

describe('restyled existing cards keep their behaviour', () => {
  it('F2 Vitana Index: the action button opens the Index sheet; outside Home the X goes to the strip', () => {
    const opened = vi.fn();
    window.addEventListener(VITANA_INDEX_OPEN_EVENT, opened);
    const onDismiss = vi.fn();
    renderCard('F2', { onDismiss });
    fireEvent.click(screen.getByRole('button', { name: deId.viewIndex }));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: deId.viewIndex }).getAttribute('data-shape')).toBe('pill');
    fireEvent.click(screen.getByRole('button', { name: 'Karte ausblenden' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: deId.viewIndex })).toBeNull();
    window.removeEventListener(VITANA_INDEX_OPEN_EVENT, opened);
  });

  it('F1 Guided Journey: without the audiobook the button opens My Journey', () => {
    renderCard('F1');
    fireEvent.click(screen.getByRole('button', { name: deId.viewJourney }));
    expect(screen.getByTestId('where').textContent).toBe('/autopilot');
  });

  it('F1 Guided Journey: with the audiobook the shared pill plays today\'s episode and does not open My Journey', () => {
    h.audiobook = { start: vi.fn() };
    renderCard('F1');
    const play = screen.getByTestId('home-play-todays-episode');
    expect(play.getAttribute('data-shape')).toBe('pill');
    fireEvent.click(play);
    expect(h.audiobook.start).toHaveBeenCalledWith({ episode: 3 });
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('F1/F2 keep their live numbers in the text and the action button in the widget slot', () => {
    renderCard('F1');
    expect(screen.getByText(/Folge 3 wartet · 2 erledigt · heute 0\/1/)).toBeInTheDocument();
    renderCard('F2');
    expect(screen.getByText(/Index 512/)).toBeInTheDocument();
  });

  it('F7 Invite: the rounded-square button shares the invite', () => {
    renderCard('F7', { onDismiss: () => {} });
    const share = screen.getAllByRole('button').find((b) => b.getAttribute('data-shape') === 'rounded-square')!;
    fireEvent.click(share);
    expect(h.shareInvite).toHaveBeenCalledTimes(1);
  });

  it('F8 Did you know: the pill accepts and navigates; in a chat there is no X or pacing menu', () => {
    const { unmount } = renderCard('F8', { onDismiss: () => {} });
    expect(screen.getByRole('button', { name: 'Zeig es mir' }).getAttribute('data-shape')).toBe('pill');
    fireEvent.click(screen.getByRole('button', { name: 'Zeig es mir' }));
    expect(h.accept).toHaveBeenCalled();
    expect(screen.getByTestId('where').textContent).toBe('/discover');
    unmount();
    renderCard('F8');
    expect(screen.queryByTestId('dyk-card')).toBeInTheDocument();
    // VTID-05143: the card body itself is the shell's role="button"; no other control besides the pill.
    expect(
      screen.queryAllByRole('button').filter((b) => b.tagName === 'BUTTON' && b.getAttribute('data-shape') !== 'pill'),
    ).toHaveLength(0);
  });

  it('F8 Did you know: on the shell, with the tour choices (this tip / not today / stop) behind its X', () => {
    renderCard('F8', { onDismiss: () => {} });
    const card = screen.getByTestId('dyk-card');
    expect(card.querySelector('[data-vitana-card], [role="button"]')?.className).toContain('h-[138px]');
    const x = screen.getByRole('button', { name: 'Tipp ausblenden' });
    fireEvent.pointerDown(x, { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Heute nicht' }));
    expect(h.decline).toHaveBeenCalledWith('today');
    expect(h.accept).not.toHaveBeenCalled();
  });

  it('F8 splits the server tip into headline + subtext (Latin, CJK, Arabic; one sentence = headline only)', () => {
    expect(splitTipCopy('Wusstest du das? Vitana hört zu.')).toEqual({ headline: 'Wusstest du das?', subtext: 'Vitana hört zu.' });
    expect(splitTipCopy('你知道吗？Vitana 会听。')).toEqual({ headline: '你知道吗？', subtext: 'Vitana 会听。' });
    expect(splitTipCopy('هل تعلم؟ Vitana تستمع.')).toEqual({ headline: 'هل تعلم؟', subtext: 'Vitana تستمع.' });
    expect(splitTipCopy('Just one tip')).toEqual({ headline: 'Just one tip', subtext: '' });
  });

  it('existing cards with no onDismiss (chat) show no X', () => {
    renderCard('F2');
    expect(screen.queryByRole('button', { name: 'Karte ausblenden' })).toBeNull();
  });

  it('the "Did you know" feature-announcement card navigates from its action button', () => {
    render(
      <MemoryRouter initialEntries={['/start']}>
        <Routes>
          <Route
            path="/start"
            element={<FeatureAnnouncementCard variant="did-you-know-feature" featureTitle="Live" description="Rooms" deepLink="/comm/events-meetups" />}
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    const btn = screen.getAllByRole('button').find((b) => b.getAttribute('data-shape') === 'pill')!;
    fireEvent.click(btn);
    expect(screen.getByTestId('where').textContent).toBe('/comm/events-meetups');
  });
});

describe('per-screen card lists (plan §4)', () => {
  it('match the plan, and Home gets no new feature cards', () => {
    expect(CARD_SCREENS.home.features).toEqual([]);
    expect(CARD_SCREENS.profile.features).toEqual(['F2', 'F4', 'F7']);
    expect(CARD_SCREENS['vitana-index'].features).toEqual(['F3', 'F4', 'F6']);
    expect(CARD_SCREENS.autopilot.features).toEqual(['F1', 'F2', 'F3', 'F9']);
    expect(CARD_SCREENS.community.features).toEqual(['F5', 'F7', 'F10']);
    expect(CARD_SCREENS['talk-to-vitana'].features).toEqual(['F1', 'F2', 'F3']);
    expect(CARD_SCREENS.calendar.features).toEqual(['F1', 'F6', 'F8']);
    expect(CARD_SCREENS['longevity-journey'].features).toEqual(['F1', 'F2', 'F3', 'F5', 'F8']);
    expect(CARD_SCREENS['make-a-post']).toMatchObject({ server: 'community', allow: ['E3'], features: ['F5', 'F7', 'F10'] });
  });
});
