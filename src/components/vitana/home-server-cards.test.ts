/**
 * VTID-05143 Phase 3 — which server cards Home puts in front of its existing
 * Vitana cards: up to 2 enrichment cards, then the boost cards, and never
 * more than 3 new cards in total (owner decision 2026-10-13) — the same cap
 * withHomeNewCards() enforces again right before composeFeed.
 */
import { describe, it, expect } from 'vitest';
import { pickHomeServerCards, CARD_SCREENS, type VitanaCardType, type CardCategory } from './vitana-card-catalog';
import { withHomeNewCards, HOME_NEW_CARD_CAP } from '@/lib/feed-compose';

const e = (t: VitanaCardType) => ({ card_type: t, category: 'enrichment' as CardCategory });
const g = (t: VitanaCardType) => ({ card_type: t, category: 'boost' as CardCategory });
const types = (cards: Array<{ card_type: string }>) => cards.map((c) => c.card_type);

describe('pickHomeServerCards (Home: enrichment + boost, cap 3)', () => {
  it('Home places all three boost cards (plan §4)', () => {
    expect(CARD_SCREENS.home.boost).toEqual(['G1', 'G2', 'G3']);
  });

  it('two enrichment cards then one boost card — 3 in total', () => {
    const out = pickHomeServerCards([e('E1'), e('E2'), e('E3'), g('G3'), g('G2'), g('G1')]);
    expect(types(out)).toEqual(['E1', 'E2', 'G3']);
  });

  it('with one enrichment card, two boost cards fill the cap', () => {
    expect(types(pickHomeServerCards([e('E5'), g('G3'), g('G2'), g('G1')]))).toEqual(['E5', 'G3', 'G2']);
  });

  it('with no enrichment card, up to three boost cards in server order', () => {
    expect(types(pickHomeServerCards([g('G2'), g('G1')]))).toEqual(['G2', 'G1']);
    expect(types(pickHomeServerCards([g('G3'), g('G2'), g('G1')]))).toEqual(['G3', 'G2', 'G1']);
  });

  it('boost cards always follow the enrichment cards, whatever the server order', () => {
    expect(types(pickHomeServerCards([g('G1'), e('E1')]))).toEqual(['E1', 'G1']);
  });

  it('never more than 3, and the Home cap before composeFeed still holds', () => {
    const many = [e('E1'), e('E2'), e('E3'), e('E4'), g('G1'), g('G2'), g('G3')];
    const picked = pickHomeServerCards(many);
    expect(picked.length).toBeLessThanOrEqual(HOME_NEW_CARD_CAP);
    const existing = ['index', 'journey', 'invite'];
    const feedCards = withHomeNewCards(types(picked), existing);
    expect(feedCards).toEqual(['E1', 'E2', 'G1', 'index', 'journey', 'invite']);
  });

  it('drops feature cards and boost types Home does not place', () => {
    expect(types(pickHomeServerCards([{ card_type: 'F3' as VitanaCardType, category: 'feature' as CardCategory }, g('G2')]))).toEqual(['G2']);
  });

  it('empty in, empty out', () => {
    expect(pickHomeServerCards([])).toEqual([]);
  });
});
