/**
 * VTID-05036 — the item form's rules, kept free of React so they are tested
 * directly: slug from the German title, validation that mirrors the table's
 * CHECKs (VTID-04982 migration) and the exact PUT /admin/rewards/items body.
 */
import type { ShopFulfilment } from '@/hooks/useRewardShop';
import type { AdminRewardItem, AdminRewardItemBody } from '@/hooks/useAdminRewardShop';

/** reward_shop_items.slug CHECK: `^[a-z0-9][a-z0-9-]{1,79}$`. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,79}$/;
export const ISO2_RE = /^[A-Z]{2}$/;
export const DEFAULT_MIN_AGE = 18;
export const DEFAULT_SORT_ORDER = 100;
/** VTNA → EUR, same rate the member shop shows (VTID-04982). */
export const EUR_PER_VTNA = 0.01;

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', Ä: 'ae', Ö: 'oe', Ü: 'ue' };

/** "Son Amaret Chardonnay – Größe 0,75 l" → "son-amaret-chardonnay-groesse-0-75-l". */
export function slugify(title: string): string {
  const s = title
    .replace(/[äöüßÄÖÜ]/g, (c) => UMLAUTS[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return s;
}

export interface ItemFormValues {
  slug: string;
  titleDe: string;
  titleEn: string;
  descriptionDe: string;
  descriptionEn: string;
  /** images[0] — the one photo the form manages. */
  mainImage: string | null;
  /** images[1..] — kept exactly as they were. */
  extraImages: string[];
  price: string;
  fulfilment: ShopFulfilment;
  ageRestricted: boolean;
  minAge: string;
  countries: string[];
  stock: string;
  sortOrder: string;
  isActive: boolean;
}

export function emptyItemForm(): ItemFormValues {
  return {
    slug: '',
    titleDe: '',
    titleEn: '',
    descriptionDe: '',
    descriptionEn: '',
    mainImage: null,
    extraImages: [],
    price: '',
    fulfilment: 'ship',
    ageRestricted: false,
    minAge: String(DEFAULT_MIN_AGE),
    countries: [],
    stock: '',
    sortOrder: String(DEFAULT_SORT_ORDER),
    // New items stay invisible to members until the admin switches them on.
    isActive: false,
  };
}

export function itemToForm(item: AdminRewardItem): ItemFormValues {
  const images = Array.isArray(item.images) ? item.images : [];
  return {
    slug: item.slug,
    titleDe: item.titles?.de ?? '',
    titleEn: item.titles?.en ?? '',
    descriptionDe: item.descriptions?.de ?? '',
    descriptionEn: item.descriptions?.en ?? '',
    mainImage: images[0] ?? null,
    extraImages: images.slice(1),
    price: String(item.vtna_price),
    fulfilment: item.fulfilment,
    ageRestricted: item.age_restricted,
    minAge: String(item.min_age ?? DEFAULT_MIN_AGE),
    countries: [...(item.ships_to_countries ?? [])],
    stock: item.stock == null ? '' : String(item.stock),
    sortOrder: String(item.sort_order ?? DEFAULT_SORT_ORDER),
    isActive: item.is_active,
  };
}

export type ItemFormField = 'titleDe' | 'slug' | 'price' | 'minAge' | 'countries' | 'stock' | 'sortOrder';
/** Field → catalog key under admin.rewardsShop.validation. */
export type ItemFormErrors = Partial<Record<ItemFormField, string>>;

const INT_RE = /^-?\d+$/;

function intOf(s: string): number | null {
  const v = s.trim();
  return INT_RE.test(v) ? Number(v) : null;
}

export function validateItemForm(v: ItemFormValues): ItemFormErrors {
  const e: ItemFormErrors = {};
  if (!v.titleDe.trim()) e.titleDe = 'titleDe';
  if (!SLUG_RE.test(v.slug)) e.slug = 'slug';
  const price = intOf(v.price);
  if (price === null || price <= 0) e.price = 'price';
  if (v.ageRestricted) {
    const age = intOf(v.minAge);
    if (age === null || age < 1 || age > 99) e.minAge = 'minAge';
  }
  if (v.fulfilment === 'ship' && v.countries.filter((c) => ISO2_RE.test(c)).length === 0) e.countries = 'countries';
  if (v.stock.trim()) {
    const stock = intOf(v.stock);
    if (stock === null || stock < 0) e.stock = 'stock';
  }
  if (v.sortOrder.trim() && intOf(v.sortOrder) === null) e.sortOrder = 'sortOrder';
  return e;
}

/** Sets or clears one locale in a per-locale text map, keeping every other locale as it was. */
function withLocale(base: Record<string, string>, lc: string, value: string): Record<string, string> {
  const out = { ...base };
  const v = value.trim();
  if (v) out[lc] = v;
  else delete out[lc];
  return out;
}

/**
 * The PUT body — exactly the fields the gateway reads. `original` keeps
 * locales the form does not edit (titles.es, …) and any extra images.
 * Call only after validateItemForm returned no errors.
 */
export function buildItemBody(v: ItemFormValues, original?: AdminRewardItem | null): AdminRewardItemBody {
  const titles = withLocale(withLocale(original?.titles ?? {}, 'de', v.titleDe), 'en', v.titleEn);
  const descriptions = withLocale(withLocale(original?.descriptions ?? {}, 'de', v.descriptionDe), 'en', v.descriptionEn);
  const stock = v.stock.trim() ? Number(v.stock.trim()) : null;
  const sort = v.sortOrder.trim() ? Number(v.sortOrder.trim()) : DEFAULT_SORT_ORDER;
  return {
    slug: original?.slug ?? v.slug,
    titles,
    descriptions,
    images: [...(v.mainImage ? [v.mainImage] : []), ...v.extraImages],
    vtna_price: Number(v.price.trim()),
    fulfilment: v.fulfilment,
    age_restricted: v.ageRestricted,
    min_age: v.ageRestricted ? Number(v.minAge.trim()) : null,
    ships_to_countries: v.fulfilment === 'ship' ? [...new Set(v.countries.filter((c) => ISO2_RE.test(c)))] : [],
    stock,
    is_active: v.isActive,
    sort_order: sort,
  };
}

/** The saved item with only `is_active` changed — the list's on/off switch. */
export function itemWithActive(item: AdminRewardItem, isActive: boolean): AdminRewardItemBody {
  return { ...buildItemBody(itemToForm(item), item), is_active: isActive };
}

/** "DE", " de " → "DE"; anything that is not two letters → null. */
export function normaliseCountry(raw: string): string | null {
  const c = raw.trim().toUpperCase();
  return ISO2_RE.test(c) ? c : null;
}
