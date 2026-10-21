/**
 * VTID-05210 — Profile shows only the Vitana cards that enrich the profile
 * (owner 2026-10-15): E1–E7, E11 and G1. Connectors (E8, E9), notifications
 * (E10), Vitana Index (F2), Talk to Vitana (F4) and Invite (F7) never appear
 * on it. Every card type renders here (full registry stub), so a missing card
 * is filtered by placement, not by an unrenderable component.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { VitanaCardProps } from './card-props';
import { ENRICHMENT_CARD_TYPES, FEATURE_CARD_TYPES, BOOST_CARD_TYPES } from './vitana-card-catalog';

type ServerCard = { card_type: string; category: string; priority: number; title: string; description: string };
const hook = { cards: [] as ServerCard[], isLoading: false, isError: false, dismiss: vi.fn() };

vi.mock('@/hooks/useEnrichmentCards', () => ({ useEnrichmentCards: () => hook }));

vi.mock('./card-registry', async () => {
  const catalog = await vi.importActual<typeof import('./vitana-card-catalog')>('./vitana-card-catalog');
  const all = [...catalog.ENRICHMENT_CARD_TYPES, ...catalog.FEATURE_CARD_TYPES, ...catalog.BOOST_CARD_TYPES];
  const map = Object.fromEntries(
    all.map((t) => [t, ({ title }: VitanaCardProps) => <div data-testid={`card-${t}`}>{title}</div>]),
  );
  return { getVitanaCardComponent: (t: string) => map[t] ?? null, VITANA_CARD_REGISTRY: map };
});

import { EnrichmentCardStrip } from './EnrichmentCardStrip';
import { PROFILE_ENRICHMENT_CARDS } from './vitana-card-catalog';

const enrichment = (t: string): ServerCard => ({ card_type: t, category: 'enrichment', priority: 1, title: t, description: '' });
const boost = (t: string): ServerCard => ({ card_type: t, category: 'boost', priority: 1, title: t, description: '' });
const ids = () => screen.queryAllByTestId(/^card-/).map((n) => n.getAttribute('data-testid'));

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', RO);
  vi.stubGlobal('IntersectionObserver', RO);
});

beforeEach(() => {
  hook.cards = [];
  hook.isLoading = false;
  hook.isError = false;
  localStorage.clear();
});

describe('Profile Vitana cards (VTID-05210)', () => {
  it('the carousel keeps E1–E7 and E11 in server order and drops E8, E9 and E10', () => {
    // Gateway priority order (ENRICHMENT_PRIORITY), every enrichment card open.
    hook.cards = ['E1', 'E2', 'E3', 'E6', 'E7', 'E8', 'E9', 'E4', 'E5', 'E10', 'E11'].map(enrichment);
    render(<EnrichmentCardStrip screen="profile" layout="carousel" maxCards={PROFILE_ENRICHMENT_CARDS.length} only="server" />);
    expect(ids()).toEqual(['card-E1', 'card-E2', 'card-E3', 'card-E6', 'card-E7', 'card-E4', 'card-E5', 'card-E11']);
  });

  it('maxCards = PROFILE_ENRICHMENT_CARDS.length shows every profile card at once', () => {
    hook.cards = ENRICHMENT_CARD_TYPES.map(enrichment);
    render(<EnrichmentCardStrip screen="profile" only="server" maxCards={PROFILE_ENRICHMENT_CARDS.length} />);
    expect(ids()).toHaveLength(PROFILE_ENRICHMENT_CARDS.length);
  });

  it('the stacked half holds only G1 — no Vitana Index, Talk to Vitana, Invite or other boost card', () => {
    hook.cards = [enrichment('E1'), ...BOOST_CARD_TYPES.map(boost)];
    render(<EnrichmentCardStrip screen="profile" layout="stacked" only="features" />);
    expect(ids()).toEqual(['card-G1']);
  });

  it('with G1 not fired the stacked half renders nothing', () => {
    hook.cards = [enrichment('E1')];
    const { container } = render(<EnrichmentCardStrip screen="profile" layout="stacked" only="features" />);
    expect(container.innerHTML).toBe('');
  });

  it('no feature card ever reaches the profile, whatever the server sends', () => {
    hook.cards = [...ENRICHMENT_CARD_TYPES.map(enrichment), ...BOOST_CARD_TYPES.map(boost)];
    render(
      <>
        <EnrichmentCardStrip screen="profile" layout="stacked" only="features" />
        <EnrichmentCardStrip screen="profile" layout="carousel" maxCards={20} only="server" />
      </>,
    );
    const shown = ids();
    for (const f of FEATURE_CARD_TYPES) expect(shown).not.toContain(`card-${f}`);
    for (const e of ['E8', 'E9', 'E10']) expect(shown).not.toContain(`card-${e}`);
    expect(shown).toContain('card-G1');
  });
});
