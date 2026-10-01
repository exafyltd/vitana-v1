/**
 * VTID-04795 — business-level sales setup, without the UI.
 *
 * Everything here maps onto the business's shop record (`merchants`), saved
 * through the existing `PUT /partner-onboarding/:orgId/catalogue/merchant`.
 * That endpoint does not return the current sales values (its field list is
 * id/name/vertical/country), so the sheet starts from blanks and sends ONLY
 * what the supplier actually changed — an untouched affiliate network is
 * never sent, so a business on Awin or Admitad can never be reset to "none"
 * by opening and saving the sheet.
 */

/** The regions `merchants` stores a delivery time for (avg_delivery_days_*). */
export const DELIVERY_REGIONS = [
  { key: 'eu', labelKey: 'deliveryEu', column: 'avg_delivery_days_eu' },
  { key: 'us', labelKey: 'deliveryUs', column: 'avg_delivery_days_us' },
  { key: 'mena', labelKey: 'deliveryMena', column: 'avg_delivery_days_mena' },
] as const;

export type DeliveryKey = (typeof DELIVERY_REGIONS)[number]['key'];
export type DeliveryColumn = (typeof DELIVERY_REGIONS)[number]['column'];

/** Empty string, not 0 — "unanswered" and "same day" are different facts. */
export const EMPTY_DELIVERY: Record<DeliveryKey, string> = { eu: '', us: '', mena: '' };

/**
 * Only the regions the supplier actually answered, as whole days 0–120. A
 * blank or a non-number is omitted so the column keeps its value.
 */
export function deliveryDaysPayload(d: Record<DeliveryKey, string>): Partial<Record<DeliveryColumn, number>> {
  const out: Record<string, number> = {};
  for (const { key, column } of DELIVERY_REGIONS) {
    const raw = d[key].trim();
    if (raw === '') continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 120) continue;
    out[column] = n;
  }
  return out;
}

/**
 * "Where do you sell?" plus one typical delivery time, with per-region
 * overrides only when the supplier asked for them. Worldwide means every
 * region we store a time for.
 */
export function deliveryFromSimple(
  regions: ReadonlyArray<DeliveryKey | 'world'>,
  typical: string,
  overrides: Record<DeliveryKey, string> | null,
): Record<DeliveryKey, string> {
  const selected = new Set<DeliveryKey>(
    regions.includes('world') ? DELIVERY_REGIONS.map((r) => r.key) : (regions as DeliveryKey[]),
  );
  const out = { ...EMPTY_DELIVERY };
  for (const { key } of DELIVERY_REGIONS) {
    if (!selected.has(key)) continue;
    const own = overrides?.[key]?.trim();
    out[key] = own ? own : typical;
  }
  return out;
}

/**
 * The catalog vertical a business's shop record starts in, from what it said
 * it offers at registration. The merchant endpoint requires one; a product can
 * still be filed under any vertical.
 */
export function verticalForOrgType(orgType: string | null | undefined): string {
  switch (orgType) {
    case 'health_medical':
      return 'diagnostics';
    case 'fitness_wellness':
      return 'fitness_equipment';
    case 'supplements_nutrition':
      return 'supplements';
    case 'textiles_apparel':
      return 'apparel';
    case 'travel_tourism':
      return 'services';
    default:
      return 'other';
  }
}

export type AffiliateNetwork = 'awin' | 'admitad' | 'other';

export interface SalesDraft {
  storefrontUrl: string;
  /** null = the supplier did not touch the advanced setting; nothing is sent. */
  network: AffiliateNetwork | null;
  advertiserId: string;
  delivery: Record<DeliveryKey, string>;
}

/** The merchant fields to send — only what the supplier set. */
export function salesPayload(d: SalesDraft): Record<string, unknown> {
  const out: Record<string, unknown> = { ...deliveryDaysPayload(d.delivery) };
  if (d.storefrontUrl.trim()) out.storefront_url = d.storefrontUrl.trim();
  if (d.network) {
    out.affiliate_network = d.network;
    // Omitted for 'other': the gateway refuses a named network without an id.
    if (d.network !== 'other') out.affiliate_advertiser_id = d.advertiserId.trim();
  }
  return out;
}

/** A named network needs its advertiser id, or a sale can never be matched back. */
export function salesDraftValid(d: SalesDraft): boolean {
  return !(d.network && d.network !== 'other' && d.advertiserId.trim().length === 0);
}
