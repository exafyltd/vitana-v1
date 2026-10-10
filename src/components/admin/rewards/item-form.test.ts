/**
 * VTID-05036 — item form rules: slug from the German title, validation that
 * mirrors reward_shop_items' CHECKs, the exact PUT body, and the shop rules
 * (missing fees, allowed order moves).
 */
import { describe, expect, it } from 'vitest';
import type { AdminRewardItem } from '@/hooks/useAdminRewardShop';
import {
  buildItemBody,
  emptyItemForm,
  itemToForm,
  itemWithActive,
  slugify,
  validateItemForm,
  type ItemFormValues,
} from './item-form';
import { missingShippingFees, nextOrderStatuses, parseFeeCents } from './shop-rules';

const PUT_FIELDS = [
  'age_restricted', 'descriptions', 'fulfilment', 'images', 'is_active', 'min_age', 'ships_to_countries',
  'slug', 'sort_order', 'stock', 'titles', 'vtna_price',
].sort();

function filled(over: Partial<ItemFormValues> = {}): ItemFormValues {
  return { ...emptyItemForm(), titleDe: 'Son Amaret Chardonnay', slug: 'son-amaret-chardonnay', price: '1200', countries: ['DE'], ...over };
}

const saved: AdminRewardItem = {
  id: 'i-1', slug: 'wine', titles: { de: 'Wein', en: 'Wine', es: 'Vino' }, descriptions: { de: 'Gut' },
  images: ['https://x/a.webp', 'https://x/b.webp'], vtna_price: 1200, fulfilment: 'ship', age_restricted: true,
  min_age: 18, ships_to_countries: ['DE', 'AT'], stock: 5, reserved: 1, is_active: true, sort_order: 10,
};

describe('item form (VTID-05036)', () => {
  it('makes the slug from the German title: lowercase ascii with hyphens', () => {
    expect(slugify('Son Amaret Chardonnay – MAXINA Edition')).toBe('son-amaret-chardonnay-maxina-edition');
    expect(slugify('Größe & Süße: Käse 0,75 l')).toBe('groesse-suesse-kaese-0-75-l');
    expect(slugify('Crème brûlée')).toBe('creme-brulee');
    expect(slugify('  --  ')).toBe('');
    expect(slugify('x'.repeat(120))).toHaveLength(80);
  });

  it('requires a German title', () => {
    expect(validateItemForm(filled({ titleDe: '  ' })).titleDe).toBe('titleDe');
    expect(validateItemForm(filled({ titleEn: '' })).titleDe).toBeUndefined();
  });

  it('requires an integer price > 0', () => {
    expect(validateItemForm(filled({ price: '' })).price).toBe('price');
    expect(validateItemForm(filled({ price: '0' })).price).toBe('price');
    expect(validateItemForm(filled({ price: '12.5' })).price).toBe('price');
    expect(validateItemForm(filled({ price: '-3' })).price).toBe('price');
    expect(validateItemForm(filled({ price: '300' })).price).toBeUndefined();
  });

  it('a ship item needs at least one country; event and digital items do not', () => {
    expect(validateItemForm(filled({ countries: [] })).countries).toBe('countries');
    expect(validateItemForm(filled({ countries: [], fulfilment: 'event' })).countries).toBeUndefined();
    expect(validateItemForm(filled({ countries: [], fulfilment: 'digital' })).countries).toBeUndefined();
  });

  it('checks slug, min age and stock against the table rules', () => {
    expect(validateItemForm(filled({ slug: 'A b' })).slug).toBe('slug');
    expect(validateItemForm(filled({ slug: 'x' })).slug).toBe('slug');
    expect(validateItemForm(filled({ ageRestricted: true, minAge: '0' })).minAge).toBe('minAge');
    expect(validateItemForm(filled({ ageRestricted: true, minAge: '18' })).minAge).toBeUndefined();
    expect(validateItemForm(filled({ stock: '-1' })).stock).toBe('stock');
    expect(validateItemForm(filled({ stock: '' })).stock).toBeUndefined();
    expect(validateItemForm(filled())).toEqual({});
  });

  it('a new item: inactive, exactly the gateway fields, slug as entered, empty stock = unlimited', () => {
    const body = buildItemBody(filled({ titleEn: 'Son Amaret Chardonnay', descriptionDe: '' }), null);
    expect(Object.keys(body).sort()).toEqual(PUT_FIELDS);
    expect(body).toEqual({
      slug: 'son-amaret-chardonnay',
      titles: { de: 'Son Amaret Chardonnay', en: 'Son Amaret Chardonnay' },
      descriptions: {},
      images: [],
      vtna_price: 1200,
      fulfilment: 'ship',
      age_restricted: false,
      min_age: null,
      ships_to_countries: ['DE'],
      stock: null,
      is_active: false,
      sort_order: 100,
    });
  });

  it('editing keeps the saved slug, other locales and the extra photos', () => {
    const v = itemToForm(saved);
    expect(v.mainImage).toBe('https://x/a.webp');
    const body = buildItemBody({ ...v, slug: 'changed', titleDe: 'Rotwein', mainImage: 'https://x/new.webp' }, saved);
    expect(body.slug).toBe('wine');
    expect(body.titles).toEqual({ de: 'Rotwein', en: 'Wine', es: 'Vino' });
    expect(body.images).toEqual(['https://x/new.webp', 'https://x/b.webp']);
    expect(body.min_age).toBe(18);
    expect(body.stock).toBe(5);
    const removed = buildItemBody({ ...v, mainImage: null }, saved);
    expect(removed.images).toEqual(['https://x/b.webp']);
  });

  it('a non-ship item sends no countries; the list switch changes only is_active', () => {
    const body = buildItemBody(filled({ fulfilment: 'event', countries: ['DE'] }));
    expect(body.ships_to_countries).toEqual([]);
    const off = itemWithActive(saved, false);
    expect(off).toEqual({ ...buildItemBody(itemToForm(saved), saved), is_active: false });
    expect(Object.keys(off).sort()).toEqual(PUT_FIELDS);
  });
});

describe('shop rules (VTID-05036)', () => {
  const ship = (over: Partial<AdminRewardItem>): AdminRewardItem => ({ ...saved, ...over });

  it('lists every active ship item country that lacks a fee row, per currency', () => {
    const items = [
      ship({ id: 'a', ships_to_countries: ['DE', 'AT'] }),
      ship({ id: 'b', ships_to_countries: ['CH'], is_active: false }),
      ship({ id: 'c', fulfilment: 'event', ships_to_countries: ['FR'] }),
    ];
    const fees = [
      { country: 'DE', currency: 'EUR' as const, fee_cents: 690 },
      { country: 'DE', currency: 'USD' as const, fee_cents: 790 },
      { country: 'AT', currency: 'EUR' as const, fee_cents: 990 },
    ];
    expect(missingShippingFees(items, fees)).toEqual([{ country: 'AT', currencies: ['USD'] }]);
    expect(missingShippingFees(items, [])).toEqual([
      { country: 'AT', currencies: ['EUR', 'USD'] },
      { country: 'DE', currencies: ['EUR', 'USD'] },
    ]);
  });

  it('offers only the moves the gateway accepts; cancelled/refunded are read-only', () => {
    expect(nextOrderStatuses('paid')).toEqual(['fulfilling', 'shipped', 'delivered']);
    expect(nextOrderStatuses('shipped')).toEqual(['delivered']);
    for (const s of ['cancelled', 'refunded', 'delivered', 'awaiting_shipping_payment']) expect(nextOrderStatuses(s)).toEqual([]);
    for (const s of ['paid', 'fulfilling', 'shipped']) expect(nextOrderStatuses(s)).not.toContain('cancelled');
  });

  it('parses a fee in euros/dollars into cents', () => {
    expect(parseFeeCents('6,90')).toBe(690);
    expect(parseFeeCents('7')).toBe(700);
    expect(parseFeeCents('0')).toBe(0);
    expect(parseFeeCents('-1')).toBeNull();
    expect(parseFeeCents('1.999')).toBeNull();
  });
});
