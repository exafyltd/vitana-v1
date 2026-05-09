// Singleton-locale toast helpers. Work in components, hooks, AND utility
// functions (no React hook required).
//
// LanguageContext calls setI18nLocale() whenever the user changes language;
// notify/notifyError look up the catalog directly via the singleton.
//
// Usage:
//   notify('toasts.diary.entrySaved')
//   notifyError('toasts.tickets.downloadFailed')
//   notify('toasts.orders.created', undefined, { orderId: '#1234' })
//
// Replacements use {paramName} placeholders. Keys not found fall back to
// the key string itself in production, and to "[[missing:key]]" in dev.

import { catalogs } from '@/i18n';
import { toast as sonnerToast } from 'sonner';

let currentLocale = 'de-DE';

export function setI18nLocale(locale: string): void {
  currentLocale = locale;
}

export function getI18nLocale(): string {
  return currentLocale;
}

// Exported so rich toasts (with action/duration/JSX) can keep their full
// shape via the underlying sonner.toast(...) API while still pulling strings
// from the catalog: toast(lookup('toasts.x.y'), { description: lookup(...), action: <Button/> })
export function lookup(key: string, params?: Record<string, string | number>): string {
  return applyParams(lookupRaw(key), params);
}

// Short alias for JSX use: <Button>{t('screens.foo.save')}</Button>
// Singleton-style: works in components AND non-components. Re-render on
// language change happens via LanguageProvider re-rendering its tree on
// selectedLanguage state change.
export const t = lookup;

function lookupRaw(key: string): string {
  const parts = key.split('.');
  const fallbackCatalog = catalogs['de-DE'];
  const primary = catalogs[currentLocale] || fallbackCatalog;

  for (const cat of [primary, fallbackCatalog]) {
    let v: unknown = cat;
    let ok = true;
    for (const p of parts) {
      if (v && typeof v === 'object' && p in (v as Record<string, unknown>)) {
        v = (v as Record<string, unknown>)[p];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && typeof v === 'string') return v;
  }

  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[i18n-toast] missing key: "${key}" in ${currentLocale}`);
    return `[[missing:${key}]]`;
  }
  return key;
}

function applyParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let out = text;
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

export function notify(
  titleKey: string,
  descKey?: string,
  params?: Record<string, string | number>
): void {
  const title = lookup(titleKey, params);
  const description = descKey ? lookup(descKey, params) : undefined;
  sonnerToast(title, description ? { description } : undefined);
}

export function notifySuccess(
  titleKey: string,
  descKey?: string,
  params?: Record<string, string | number>
): void {
  const title = lookup(titleKey, params);
  const description = descKey ? lookup(descKey, params) : undefined;
  sonnerToast.success(title, description ? { description } : undefined);
}

export function notifyError(
  titleKey: string,
  descKey?: string,
  params?: Record<string, string | number>
): void {
  const title = lookup(titleKey, params);
  const description = descKey ? lookup(descKey, params) : undefined;
  sonnerToast.error(title, description ? { description } : undefined);
}

export function notifyWarning(
  titleKey: string,
  descKey?: string,
  params?: Record<string, string | number>
): void {
  const title = lookup(titleKey, params);
  const description = descKey ? lookup(descKey, params) : undefined;
  sonnerToast.warning(title, description ? { description } : undefined);
}

export const notifyInfo = notify;
