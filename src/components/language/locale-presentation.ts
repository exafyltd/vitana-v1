import deFlag from '@/assets/flags/de.png';
import gbFlag from '@/assets/flags/gb.png';
import esFlag from '@/assets/flags/es.png';
import frFlag from '@/assets/flags/fr.png';
import rsFlag from '@/assets/flags/rs.png';
import ptFlag from '@/assets/flags/pt.png';
import ruFlag from '@/assets/flags/ru.png';
import plFlag from '@/assets/flags/pl.png';
import saFlag from '@/assets/flags/sa.png';
import cnFlag from '@/assets/flags/cn.png';
import trFlag from '@/assets/flags/tr.png';

export interface LocalePresentation {
  flag: string;
  endonym: string;
}

/**
 * Presentation for a locale: flag + ENDONYM (the language's own name).
 *
 * Endonyms, not translated names, on purpose: someone looking for French scans
 * for "Français", not for "Französisch" or "French". They are also identical in
 * every locale, so they need no i18n keys — the picker reads the same whatever
 * language the UI happens to be in.
 *
 * Single source of truth shared by every in-app language picker (intro screen,
 * mobile drawer, desktop sidebar) — a second copy of this map has drifted
 * before (see the i18n catalog quality notes in CLAUDE.md), so new pickers
 * must import this rather than redefine it.
 */
export const LOCALE_PRESENTATION: Record<string, LocalePresentation> = {
  'de-DE': { flag: deFlag, endonym: 'Deutsch' },
  'en-US': { flag: gbFlag, endonym: 'English' },
  'es-ES': { flag: esFlag, endonym: 'Español' },
  'sr-RS': { flag: rsFlag, endonym: 'Srpski' },
  'fr-FR': { flag: frFlag, endonym: 'Français' },
  // No Brazilian flag asset exists (src/assets/flags/ has pt.png, not br.png),
  // so this shows the PORTUGUESE flag for BRAZILIAN Portuguese. The endonym
  // carries the variant instead — "Português (BR)" — because the catalog is
  // pt-BR (VTID-03577) and silently implying Portugal is the same
  // wrong-variant error that VTID-03580 just finished removing from the
  // strings. Add br.png and this entry becomes correct with a one-line change.
  'pt-BR': { flag: ptFlag, endonym: 'Português (BR)' },
  'ru-RU': { flag: ruFlag, endonym: 'Русский' },
  'pl-PL': { flag: plFlag, endonym: 'Polski' },
  // Not GA — reachable only via ?i18n-preview=1, but mapped so the preview
  // renders properly rather than falling back to a bare English label.
  'ar-XA': { flag: saFlag, endonym: 'العربية' },
  'zh-CN': { flag: cnFlag, endonym: '简体中文' },
  'tr-TR': { flag: trFlag, endonym: 'Türkçe' },
};
