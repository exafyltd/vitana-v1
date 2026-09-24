/**
 * VTID-04502 — the screen registry: the single source of truth for where
 * information lives in the app, used by Vitana's voice navigation.
 *
 * screens.json holds structure plus English and German (the source
 * languages); locales/<code>.json holds the other shipped languages. The
 * gateway reads the merged copy the build publishes as /nav-registry.json
 * (scripts/nav/build-nav-registry.mjs), so what the assistant can open is
 * always exactly what this build can render.
 *
 * Rules for editing — enforced by registry.test.ts / registry.routes.test.ts:
 *   - every SPA route is registered here or listed in exclusions.json;
 *   - `route` / `mobileRoute` point at the page a user actually lands on
 *     (never at a <Navigate> redirect);
 *   - every overlay event has a listener somewhere in src/;
 *   - every screen has a title in all shipped languages, and every screen a
 *     user can reach by voice (no required params) has English and German
 *     phrasings describing how people ask for it.
 */
import screensFile from './screens.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';
import sr from './locales/sr.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';

export const SOURCE_LOCALES = ['en', 'de'] as const;
export const TRANSLATED_LOCALES = ['es', 'fr', 'sr', 'pl', 'pt', 'ru', 'tr', 'ar', 'zh'] as const;
export const REGISTRY_LOCALES = [...SOURCE_LOCALES, ...TRANSLATED_LOCALES] as const;
export type RegistryLocale = (typeof REGISTRY_LOCALES)[number];

export interface ScreenText {
  title: string;
  /** What information the screen shows — used when Vitana says where something is. */
  shows?: string;
  /** Free-text guidance on when this screen is the answer. */
  hint?: string;
  /** How members ask for this screen. Resolver training data, never spoken. */
  phrasings?: string[];
}

export interface ScreenOverlay {
  /** window CustomEvent the app listens for. */
  event: string;
  /** Legacy `?open=` marker, kept while the old navigator still emits it. */
  marker?: string;
  /** Entity the overlay needs (e.g. meetup_id). */
  param?: string;
}

export interface ScreenDef {
  id: string;
  /** Desktop (canonical) route, may carry a query and :params. */
  route: string;
  /** Route to use on mobile when the mobile layout lives elsewhere. */
  mobileRoute?: string;
  /** Screen exists on only one viewport. */
  viewport?: 'mobile' | 'desktop';
  overlay?: ScreenOverlay;
  /** Route params the screen needs; such screens are reached with an entity only. */
  params?: string[];
  category: string;
  access: 'public' | 'member';
  aliases?: string[];
  /** Ids merged into this screen when their page became a redirect. */
  formerIds?: string[];
  /** Set when the screen is known not to work; the reason says why. Never offered. */
  disabled?: string;
  i18n: Record<'en' | 'de', ScreenText>;
}

const LOCALE_TITLES: Record<(typeof TRANSLATED_LOCALES)[number], Record<string, { title: string }>> = {
  es, fr, sr, pl, pt, ru, tr, ar, zh,
};

export const SCREENS: readonly ScreenDef[] = (screensFile as { screens: ScreenDef[] }).screens;

const BY_ID = new Map(SCREENS.map((s) => [s.id, s]));

export function getScreen(id: string): ScreenDef | undefined {
  return BY_ID.get(id);
}

/** Screens reachable from a spoken request alone (no entity needed, not disabled). */
export function isVoiceTarget(s: ScreenDef): boolean {
  return !s.disabled && !(s.params && s.params.length) && !s.overlay?.param;
}

export function screenTitle(s: ScreenDef, locale: string): string {
  if (locale === 'en' || locale === 'de') return s.i18n[locale].title;
  const t = (LOCALE_TITLES as Record<string, Record<string, { title: string }>>)[locale]?.[s.id]?.title;
  return t || s.i18n.en.title;
}

export function localeTitles(locale: (typeof TRANSLATED_LOCALES)[number]): Record<string, { title: string }> {
  return LOCALE_TITLES[locale];
}
