/**
 * VTID-04839 — "Set up with AI": the client side of the gateway's
 * /api/v1/commerce/ai-setup endpoints (VTID-04838).
 *
 *   status → whether the portal leads with AI at all (off until the gateway
 *            switch COMMERCE_AI_SETUP_ENABLED is on; the portal then keeps its
 *            manual-first layout unchanged)
 *   draft  → website in, a draft business + products out (writes nothing)
 *   apply  → the supplier's one tap on "Create my business": the confirmed
 *            draft becomes the business and hidden draft products. Idempotent
 *            per setup key, so a double tap never creates two businesses.
 */

export const AI_SETUP_API = '/api/v1/commerce/ai-setup';

export type BusinessCategory =
  | 'health_medical'
  | 'fitness_wellness'
  | 'supplements_nutrition'
  | 'lifestyle'
  | 'textiles_apparel'
  | 'travel_tourism'
  | 'general_commerce';

export interface DraftProduct {
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string | null;
  url: string | null;
  image: string | null;
  kind: 'product' | 'service';
}

export interface SetupDraft {
  website: string;
  business: {
    display_name: string;
    category: BusinessCategory;
    country: string | null;
    description: string | null;
    currency: string | null;
  };
  products: DraftProduct[];
  source: 'shop_feed' | 'website';
  notes: string[];
}

/** What the review card edits: the draft plus which products are kept. */
export interface ReviewState {
  displayName: string;
  category: BusinessCategory;
  country: string;
  products: Array<DraftProduct & { include: boolean; priceText: string }>;
}

export type Fetcher = (path: string, init?: RequestInit) => Promise<any>;

/** A fresh key per draft; the same key is reused on every apply of that draft. */
export function newSetupKey(rand: () => string = () => crypto.randomUUID()): string {
  return `ai-setup:${rand()}`;
}

export function centsToText(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2);
}

/** "4.90" / "4,90" / "12" → 490 / 490 / 1200; anything else → null. */
export function textToCents(text: string): number | null {
  const s = text.trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s.replace(',', '.')) * 100);
}

export function reviewFromDraft(draft: SetupDraft, fallbackCountry: string): ReviewState {
  return {
    displayName: draft.business.display_name,
    category: draft.business.category,
    country: draft.business.country ?? fallbackCountry,
    products: draft.products.map((p) => ({ ...p, include: true, priceText: centsToText(p.price_cents) })),
  };
}

/** Why "Create my business" cannot be tapped yet, or null when it can. */
export function reviewProblem(r: ReviewState): 'name' | 'country' | 'price' | null {
  if (!r.displayName.trim()) return 'name';
  if (!/^[A-Z]{2}$/.test(r.country)) return 'country';
  if (r.products.some((p) => p.include && textToCents(p.priceText) === null)) return 'price';
  return null;
}

/** The apply body for a reviewed draft. Currency: the product's, else the draft's, else EUR. */
export function applyPayload(
  draft: SetupDraft,
  review: ReviewState,
  setupKey: string,
  orgId: string | null,
): Record<string, unknown> {
  const currency = draft.business.currency ?? 'EUR';
  return {
    setup_key: setupKey,
    ...(orgId ? { org_id: orgId } : {}),
    website: draft.website,
    business: { display_name: review.displayName.trim(), category: review.category, country: review.country },
    products: review.products
      .filter((p) => p.include)
      .map((p) => ({
        title: p.title.trim(),
        description: p.description,
        price_cents: textToCents(p.priceText) as number,
        currency: p.currency ?? currency,
        url: p.url,
        image: p.image,
        kind: p.kind,
      })),
  };
}

export async function fetchAiSetupEnabled(fetcher: Fetcher): Promise<boolean> {
  try {
    const res = await fetcher(`${AI_SETUP_API}/status`);
    return res?.enabled === true;
  } catch {
    return false;
  }
}

export async function requestDraft(fetcher: Fetcher, website: string): Promise<SetupDraft> {
  const res = await fetcher(`${AI_SETUP_API}/draft`, { method: 'POST', body: JSON.stringify({ website }) });
  return res.draft as SetupDraft;
}

export interface ApplyOutcome {
  organization: { id: string; display_name: string };
  created_org: boolean;
  products_added: number;
  products_replayed: number;
  product_errors: Array<{ index: number; error: string }>;
}

export async function applyDraft(fetcher: Fetcher, body: Record<string, unknown>): Promise<ApplyOutcome> {
  return (await fetcher(`${AI_SETUP_API}/apply`, { method: 'POST', body: JSON.stringify(body) })) as ApplyOutcome;
}

/** Gateway error code → the message key the sheet shows. */
export function draftErrorKey(code: string): string {
  switch (code) {
    case 'invalid_url':
      return 'screens.commerceportal.aiSetup.errorUrl';
    case 'site_unreachable':
      return 'screens.commerceportal.aiSetup.errorUnreachable';
    case 'RATE_LIMITED':
      return 'screens.commerceportal.aiSetup.errorRateLimited';
    default:
      return 'screens.commerceportal.aiSetup.errorGeneric';
  }
}
