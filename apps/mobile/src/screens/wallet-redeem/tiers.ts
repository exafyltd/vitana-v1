/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — the voucher tiers of the
 * web `RedemptionLanding.tsx` / `RedemptionConfirm.tsx` `TIER_CONFIG` and the
 * `TIER_NAMES` of `useRedeemVoucher.ts`. The web hardcodes the English names
 * and benefits; here they are catalog keys (`walletRedeemNative.tiers.*`, the
 * English shard carries the web's exact words). Pure; no IO.
 */
import type { useUITheme } from '../../ports/ui';
import type { Params } from '../../i18n';

type SemanticColors = ReturnType<typeof useUITheme>['colors'];

type Tone = 'violet' | 'amber' | 'emerald';
type Tier = { tone: Tone; icon: string; benefits: number };

export const TIERS: Record<string, Tier> = {
  test: { tone: 'emerald', icon: 'Gift', benefits: 2 },
  experience: { tone: 'violet', icon: 'Sparkles', benefits: 4 },
  exclusive: { tone: 'amber', icon: 'Star', benefits: 4 },
};

/** web `TIER_CONFIG[tier] || TIER_CONFIG.experience` (tier defaults to "experience"). */
export function tierConfigKey(tier: string | null | undefined): string {
  const t = tier || 'experience';
  return TIERS[t] ? t : 'experience';
}

/** The benefit catalog keys of a tier, in the web's order. */
export function benefitKeys(tier: string | null | undefined): string[] {
  const k = tierConfigKey(tier);
  return Array.from({ length: TIERS[k].benefits }, (_, i) => `walletRedeemNative.tiers.${k}.benefit${i + 1}`);
}

/** web `TIER_NAMES[voucher.tier] || voucher.tier`: a known tier's catalog name, else the raw tier. */
export function tierName(t: (key: string, params?: Params) => string, tier: string): string {
  return Object.prototype.hasOwnProperty.call(TIERS, tier) ? t(`walletRedeemNative.tiers.${tier}.name`) : tier;
}

/**
 * The tier tint: web `hsl(var(--primary|warning|success))` for the voucher
 * card and `TIER_BADGE` (`from-category-2 to-primary`, `from-status-warning`,
 * `from-status-success`) for the badge, as the nearest single token.
 */
export function tierColor(colors: SemanticColors, tier: string | null | undefined): string {
  const tone = TIERS[tierConfigKey(tier)].tone;
  return tone === 'violet' ? colors.primary : tone === 'amber' ? colors.statusWarning : colors.statusSuccess;
}

export function tierIcon(tier: string | null | undefined): string {
  return TIERS[tierConfigKey(tier)].icon;
}

/** web `€{(amount_cents / 100).toFixed(2)}` through the locale's number format (always EUR, like the web). */
export function formatVoucherValue(language: string, amountCents: number | null | undefined): string {
  return new Intl.NumberFormat(language, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((amountCents || 0) / 100);
}
