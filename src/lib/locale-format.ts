// Locale-aware date/number formatters that follow the user's selected
// language (LanguageContext → setI18nLocale singleton).
//
// Why this exists:
//   - `date.toLocaleDateString()` with no arg uses browser default; on
//     Appilix WebView that's typically en-US even when the user picked DE.
//   - `date.toLocaleDateString('en-US')` is an obvious hardcode.
//   - `date-fns format(d, 'PPP')` with no `{ locale }` emits English.
//
// All of these are flagged by `eslint-rules/no-raw-locale-call.js`.
//
// Use these helpers from any module — components, hooks, utility funcs.
// They read from the same singleton i18n catalog locale, so behavior is
// consistent across the app.

import { getI18nLocale } from '@/lib/i18n-toast';
import {
  format as dfFormat,
  formatDistance as dfFormatDistance,
  formatDistanceToNow as dfFormatDistanceToNow,
  formatRelative as dfFormatRelative,
  type Locale,
} from 'date-fns';
import {
  de as dfDe,
  enUS as dfEn,
  es as dfEs,
  sr as dfSr,
  ar as dfAr,
  fr as dfFr,
  pt as dfPt,
  ru as dfRu,
  zhCN as dfZh,
  pl as dfPl,
} from 'date-fns/locale';

const DATE_FNS_BY_BCP47: Record<string, Locale> = {
  'de-DE': dfDe,
  'en-US': dfEn,
  'en-GB': dfEn,
  'es-ES': dfEs,
  'sr-RS': dfSr,
  'ar-SA': dfAr,
  'fr-FR': dfFr,
  'pt-PT': dfPt,
  'pt-BR': dfPt,
  'ru-RU': dfRu,
  'zh-CN': dfZh,
  'pl-PL': dfPl,
};

function currentBcp47(): string {
  return getI18nLocale() || 'de-DE';
}

export function getDateFnsLocale(): Locale {
  return DATE_FNS_BY_BCP47[currentBcp47()] ?? dfDe;
}

// Drop-in replacement for date-fns `format(d, fmt)` that picks up the
// user's locale automatically.
export function formatDate(
  date: Date | number | string,
  pattern: string,
  opts?: Parameters<typeof dfFormat>[2],
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dfFormat(d, pattern, { ...(opts || {}), locale: getDateFnsLocale() });
}

export function formatDistance(
  date: Date | number | string,
  baseDate: Date | number | string,
  opts?: Parameters<typeof dfFormatDistance>[2],
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const b = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
  return dfFormatDistance(d, b, { ...(opts || {}), locale: getDateFnsLocale() });
}

export function formatDistanceToNow(
  date: Date | number | string,
  opts?: Parameters<typeof dfFormatDistanceToNow>[1],
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dfFormatDistanceToNow(d, { ...(opts || {}), locale: getDateFnsLocale() });
}

export function formatRelative(
  date: Date | number | string,
  baseDate: Date | number | string,
  opts?: Parameters<typeof dfFormatRelative>[2],
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const b = typeof baseDate === 'string' ? new Date(baseDate) : baseDate;
  return dfFormatRelative(d, b, { ...(opts || {}), locale: getDateFnsLocale() });
}

// Locale-aware replacements for the JS Date / Number `toLocale*` methods.
// Pass the same options bag you'd pass to the native method.
export function fmtDate(
  date: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.toLocaleDateString(currentBcp47(), options);
}

export function fmtTime(
  date: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.toLocaleTimeString(currentBcp47(), options);
}

export function fmtDateTime(
  date: Date | number | string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return d.toLocaleString(currentBcp47(), options);
}

export function fmtNumber(
  n: number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  if (n == null) return '';
  return n.toLocaleString(currentBcp47(), options);
}
