/**
 * VTID-05143 Phase 3 — the number a boost card shows (G1 %, G2 count, G3
 * streak). It comes from the gateway row's `params`; when it is missing or
 * not a usable number the card shows its plain subtext instead — never "0"
 * or "NaN". The number leads the subtext line, the way the Vitana Index card
 * shows its score, so the card keeps the shell's 138 px height.
 */
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';

/** A positive count (G2 unread matches, G3 streak days), or null. */
export function readPositiveCount(params: Record<string, unknown> | undefined, key: string): number | null {
  const value = params?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  return Math.floor(value);
}

/** A completion percentage clamped to 0–100 (G1), or null. */
export function readPercentage(params: Record<string, unknown> | undefined): number | null {
  const value = params?.percentage;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value)));
}

/** `<metric line>` with the number and the card's subtext, or the subtext alone. */
export function boostSubtext(metricKey: string, message: string, number: number | null, kind: 'count' | 'percent'): string {
  if (number === null) return message;
  if (kind === 'percent') {
    return t(metricKey, { value: fmtNumber(number / 100, { style: 'percent', maximumFractionDigits: 0 }), message });
  }
  return t(metricKey, { count: fmtNumber(number), message });
}
