/**
 * VTID-05431 (Native Wave 2, settings lane) — the `?mode=` section logic of
 * `src/pages/MobileSettings.tsx`, pure so the tests pin it: the valid
 * sections (`VALID_SECTIONS` :39-44), the initial section (an unknown or
 * missing `mode` falls back to `notifications`), the bare-parent fall-through
 * (`privacy` → `privacy.visibility`, `preferences` → `preferences.appearance`;
 * `billing` has its own overview) and the `/settings/preferences?section=`
 * redirect target (`MobileSettingsSection` in `src/App.tsx:700-713`).
 */
export const VALID_SECTIONS: ReadonlySet<string> = new Set([
  'notifications',
  'privacy',
  'privacy.visibility',
  'privacy.data',
  'privacy.security',
  'preferences',
  'preferences.appearance',
  'preferences.language',
  'billing',
  'billing.plan',
  'billing.payment',
  'billing.invoices',
  'billing.creator',
]);

export type BillingSection = 'billing' | 'billing.plan' | 'billing.payment' | 'billing.invoices' | 'billing.creator';

export function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/** `useState(() => …)` in MobileSettings: a valid `mode` or `notifications`. */
export function initialSection(mode: string | string[] | undefined): string {
  const m = firstParam(mode);
  return m && VALID_SECTIONS.has(m) ? m : 'notifications';
}

/** `renderContent()`: a bare parent renders its first child. */
export function contentSection(active: string): string {
  if (active === 'preferences') return 'preferences.appearance';
  if (active === 'privacy') return 'privacy.visibility';
  return active;
}

export function isBillingSection(section: string): section is BillingSection {
  return section === 'billing' || section.startsWith('billing.');
}

/**
 * `/settings/preferences?section=<slug>` on the phone →
 * `/settings?mode=preferences.<slug>` (no slug → `preferences`). The hub then
 * applies its own fallback, so `?section=accessibility` (not a valid section)
 * lands on `notifications`, exactly as the web does today (requirements R1.5).
 */
export function preferencesRedirectHref(section: string | string[] | undefined): string {
  const s = firstParam(section);
  return `/settings?mode=${s ? `preferences.${s}` : 'preferences'}`;
}
