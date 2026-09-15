/**
 * VTID-03894. The meter is the whole reason the vertical questions can stay
 * optional and still get answered, so its arithmetic and — more importantly —
 * its "what should I add next" suggestion need pinning.
 */
import { describe, expect, it } from 'vitest';
import { computeStrength } from './ListingStrength';
import type { VerticalField } from '@/hooks/useCommerceVerticals';

const field = (key: string, prominent = false, sort = 10): VerticalField => ({
  vertical_key: 'wine_spirits',
  field_key: key,
  display_label: key,
  help_text: null,
  data_type: 'text',
  vocabulary: null,
  unit: null,
  is_prominent: prominent,
  sort_order: sort,
});

const WINE = [
  field('wine_style', true, 10),
  field('vintage', true, 20),
  field('region', true, 30),
  field('bottle_size_ml', false, 60),
];

describe('computeStrength', () => {
  it('is 50% when only the core is done — the core already gated saving', () => {
    expect(computeStrength(WINE, {}).pct).toBe(50);
  });

  it('reaches 100% when every vertical question is answered', () => {
    const all = Object.fromEntries(WINE.map((f) => [f.field_key, 'x']));
    expect(computeStrength(WINE, all).pct).toBe(100);
  });

  it('is 100% for a vertical that asks nothing, rather than stranding it at 50%', () => {
    // `other` deliberately seeds no fields. A supplier there must not be told
    // their complete listing is half-finished.
    expect(computeStrength([], {}).pct).toBe(100);
  });

  it('climbs as questions are answered', () => {
    const a = computeStrength(WINE, { vintage: 2019 }).pct;
    const b = computeStrength(WINE, { vintage: 2019, region: 'Barolo' }).pct;
    expect(b).toBeGreaterThan(a);
  });

  it('does not count an empty string or empty array as answered', () => {
    expect(computeStrength(WINE, { vintage: '' }).pct).toBe(50);
    expect(computeStrength(WINE, { vintage: [] }).pct).toBe(50);
  });

  it('counts false as a real answer — "no, it needs no assembly" is an answer', () => {
    expect(computeStrength([field('assembly_required')], { assembly_required: false }).pct).toBe(100);
  });

  it('counts 0 as a real answer, not as missing', () => {
    expect(computeStrength([field('vintage')], { vintage: 0 }).pct).toBe(100);
  });

  it('suggests prominent questions before the rest', () => {
    const { nextUp } = computeStrength(WINE, {});
    expect(nextUp.map((f) => f.field_key)).toEqual(['wine_style', 'vintage']);
  });

  it('suggests at most two, so the nudge stays a nudge', () => {
    expect(computeStrength(WINE, {}).nextUp).toHaveLength(2);
  });

  it('suggests nothing once everything is answered', () => {
    const all = Object.fromEntries(WINE.map((f) => [f.field_key, 'x']));
    expect(computeStrength(WINE, all).nextUp).toHaveLength(0);
  });

  it('never suggests an already-answered question', () => {
    const { nextUp } = computeStrength(WINE, { wine_style: 'red' });
    expect(nextUp.map((f) => f.field_key)).not.toContain('wine_style');
  });
});
