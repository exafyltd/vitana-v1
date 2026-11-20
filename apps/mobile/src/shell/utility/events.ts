/**
 * VTID-05653 — the overlay-bus events of the shared utility bar. Same names as
 * the web window events: `vitana:open-life-compass`
 * (`LifeCompassPopupContext.tsx:14`), `vitana:open-index` (the Vitana Index
 * chip, `MobileActionChips.tsx`), `autopilot:open` (the shell drawer's event);
 * `gift-voucher:open` `{ returnTo }` is native-only (the web bar owns its
 * `MaxinaVoucherModal`, `utility-action-button.tsx:131`).
 */
export const LIFE_COMPASS_OPEN = 'vitana:open-life-compass';
export const GIFT_VOUCHER_OPEN = 'gift-voucher:open';
export const INDEX_OPEN = 'vitana:open-index';
export const AUTOPILOT_OPEN = 'autopilot:open';

export interface GiftVoucherOpenDetail {
  /** The route the Stripe checkout returns to (the web `pathname + search`). */
  returnTo?: unknown;
}
