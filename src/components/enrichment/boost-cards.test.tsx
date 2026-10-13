/**
 * VTID-05143 Phase 3 — the boost cards G1–G3: each renders in the shared
 * Vitana shell with its own accent and button shape, shows its number when
 * the gateway sends one (and reads fine without it), navigates to its deep
 * link, and its X dismisses.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import type { VitanaCardProps } from '@/components/vitana/card-props';

vi.mock('@/hooks/useEnrichmentCards', () => ({
  useInvalidateEnrichmentCards: () => vi.fn(),
  useEnrichmentCardDismiss: () => vi.fn(),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));

import { VITANA_CARD_REGISTRY } from '@/components/vitana/card-registry';
import { BOOST_CARD_TYPES, CARD_DEEP_LINKS, CARD_STYLE, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';
import { CompleteProfileCard } from './CompleteProfileCard';
import { UnreadMatchesCard } from './UnreadMatchesCard';
import { StreakAtRiskCard } from './StreakAtRiskCard';
import de from '@/i18n/de/screens.json';

type Copy = { eyebrow: string; title: string; description: string; action: string; metric: string };
const deCards = (de as unknown as { screens: { vitanaCards: Record<string, Copy> } }).screens.vitanaCards;

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.hash}</div>;
}

function renderCard(type: VitanaCardType, props: VitanaCardProps = {}) {
  const Card = VITANA_CARD_REGISTRY[type] as ComponentType<VitanaCardProps>;
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<Card {...props} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const action = (type: VitanaCardType) => screen.getByTestId(`vitana-card-action-${type}`);

describe('boost cards G1–G3', () => {
  it('the registry maps each boost type to its component', () => {
    expect(VITANA_CARD_REGISTRY.G1).toBe(CompleteProfileCard);
    expect(VITANA_CARD_REGISTRY.G2).toBe(UnreadMatchesCard);
    expect(VITANA_CARD_REGISTRY.G3).toBe(StreakAtRiskCard);
  });

  it('plan §2C accent + button shape: G1 orb pill, G2 blue pill, G3 amber round', () => {
    expect(CARD_STYLE.G1).toEqual({ accent: 'orb', shape: 'pill' });
    expect(CARD_STYLE.G2).toEqual({ accent: 'blue', shape: 'pill' });
    expect(CARD_STYLE.G3).toEqual({ accent: 'amber', shape: 'round' });
  });

  it.each(BOOST_CARD_TYPES)('%s renders in the Vitana shell with its German copy and an accessible action', (type) => {
    renderCard(type, { onDismiss: () => {} });
    expect(screen.getByAltText('Vitana')).toBeInTheDocument();
    expect(screen.getByText(deCards[type].title)).toBeInTheDocument();
    expect(screen.getByText(deCards[type].description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: deCards[type].action })).toBe(action(type));
  });

  it('G1 and G2 use the pill (visible label), G3 the round icon button (label as aria-label)', () => {
    renderCard('G1');
    expect(action('G1').textContent).toBe(deCards.G1.action);
    renderCard('G2');
    expect(action('G2').textContent).toBe(deCards.G2.action);
    renderCard('G3');
    expect(action('G3').textContent).toBe('');
    expect(action('G3').getAttribute('aria-label')).toBe(deCards.G3.action);
  });

  it.each(BOOST_CARD_TYPES)('%s: the button navigates to its deep link', (type) => {
    renderCard(type);
    fireEvent.click(action(type));
    expect(screen.getByTestId('where').textContent).toBe(CARD_DEEP_LINKS[type]);
  });

  it('deep links: G1 the profile editor, G2 the matches page, G3 the daily diary', () => {
    expect(CARD_DEEP_LINKS.G1).toBe('/me/profile');
    expect(CARD_DEEP_LINKS.G2).toBe('/me/matches');
    expect(CARD_DEEP_LINKS.G3).toBe('/daily-diary');
  });

  it.each(BOOST_CARD_TYPES)('%s: the X calls onDismiss and does not navigate', (type) => {
    const onDismiss = vi.fn();
    renderCard(type, { onDismiss });
    fireEvent.click(screen.getByRole('button', { name: 'Karte ausblenden' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('where')).toBeNull();
  });

  it('a boost card without onDismiss shows no X', () => {
    renderCard('G2');
    expect(screen.queryByRole('button', { name: 'Karte ausblenden' })).toBeNull();
  });

  it('G1 shows the completion percentage in front of the subtext', () => {
    renderCard('G1', { params: { percentage: 64 } });
    const line = screen.getByText(/geschafft/);
    expect(line.textContent).toMatch(/^64\s?% geschafft · /);
    expect(line.textContent).toContain(deCards.G1.description);
  });

  it('G2 shows the unread match count', () => {
    renderCard('G2', { params: { count: 3 } });
    expect(screen.getByText(`Neue Matches: 3 · ${deCards.G2.description}`)).toBeInTheDocument();
  });

  it('G3 shows the streak length', () => {
    renderCard('G3', { params: { streak: 12 } });
    expect(screen.getByText(`Serie: 12 Tage · ${deCards.G3.description}`)).toBeInTheDocument();
  });

  it('server-localized title and description win; the number still leads the subtext', () => {
    renderCard('G3', { title: 'Server title', description: 'Server text', params: { streak: 5 } });
    expect(screen.getByText('Server title')).toBeInTheDocument();
    expect(screen.getByText('Serie: 5 Tage · Server text')).toBeInTheDocument();
  });

  it('a missing, zero or nonsense number renders the plain subtext (no "0", no "NaN")', () => {
    const { unmount } = renderCard('G2', { params: {} });
    expect(screen.getByText(deCards.G2.description)).toBeInTheDocument();
    unmount();
    const second = renderCard('G2', { params: { count: 0 } });
    expect(screen.getByText(deCards.G2.description)).toBeInTheDocument();
    second.unmount();
    const third = renderCard('G3', { params: { streak: 'many' } });
    expect(screen.getByText(deCards.G3.description)).toBeInTheDocument();
    third.unmount();
    renderCard('G1', { params: { percentage: Number.NaN } });
    expect(screen.getByText(deCards.G1.description)).toBeInTheDocument();
  });

  it('G1 clamps an out-of-range percentage to 0–100', () => {
    renderCard('G1', { params: { percentage: 140 } });
    expect(screen.getByText(/geschafft/).textContent).toMatch(/^100\s?% geschafft/);
  });
});
