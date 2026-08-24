import { useEffect, useRef, useState } from 'react';
import { useLanguage, getVisibleLanguageOptions } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

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

/**
 * Language picker for the intro/landing screen.
 *
 * VTID-03580 — this was a hardcoded DE <-> EN toggle. It imported exactly two
 * flags and computed `isGerman ? 'en-US' : 'de-DE'`, so it could reach 2 of the
 * 8 GA languages and no more. A visitor wanting Spanish or French had to sign
 * up (in German), then find Settings -> Preferences. Eight complete, verified
 * catalogs were effectively unreachable from the one screen every visitor sees.
 *
 * The list now comes from `getVisibleLanguageOptions()` — the same GA filter the
 * settings picker uses, including its `?i18n-preview=1` override for beta/draft
 * locales. It is deliberately NOT a second copy of the language list: promoting
 * a locale to `ga` must light it up here with no edit to this file, because the
 * failure this whole programme keeps hitting is two sources of truth drifting.
 *
 * DELIBERATE SEMANTIC CHANGE: the old button showed the flag you would switch
 * TO ("shows the OPPOSITE flag"). That idiom only works with exactly two
 * languages — with eight there is no single "other" — so the button now shows
 * the flag of the language you are CURRENTLY in, which is the conventional
 * reading and the only one that stays true as the list grows.
 */

/**
 * Presentation for a locale: flag + ENDONYM (the language's own name).
 *
 * Endonyms, not translated names, on purpose: someone looking for French scans
 * for "Français", not for "Französisch" or "French". They are also identical in
 * every locale, so they need no i18n keys — the picker reads the same whatever
 * language the UI happens to be in.
 */
const LOCALE_PRESENTATION: Record<string, { flag: string; endonym: string }> = {
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

interface LanguageToggleButtonProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function LanguageToggleButton({ className, size = 'md' }: LanguageToggleButtonProps) {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const options = getVisibleLanguageOptions();
  const current = LOCALE_PRESENTATION[selectedLanguage] ?? LOCALE_PRESENTATION['de-DE'];

  // Close on outside click and on Escape. Both, not just one: a picker that
  // traps a visitor on the very first screen is worse than no picker.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // With a single language configured there is nothing to choose. Render the
  // flag as a plain, non-interactive badge rather than a button that opens an
  // empty menu.
  const isInteractive = options.length > 1;

  const sizeClasses = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const flagSizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  const glass = cn(
    'flex-shrink-0 rounded-full flex items-center justify-center',
    'bg-white/10 backdrop-blur-xl border border-white/30',
    'shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]',
    'transition-all duration-300',
    isInteractive && 'hover:bg-white/20 hover:border-white/40',
    isInteractive &&
      'hover:shadow-[0_6px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    sizeClasses,
    className,
  );

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => isInteractive && setOpen((v) => !v)}
        className={glass}
        aria-label={t.intro?.chooseLanguage || 'Choose language'}
        aria-haspopup={isInteractive ? 'listbox' : undefined}
        aria-expanded={isInteractive ? open : undefined}
        disabled={!isInteractive}
      >
        <img src={current.flag} alt="" className={cn('rounded-full object-cover', flagSizeClasses)} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t.intro?.chooseLanguage || 'Choose language'}
          // Anchored to the button's right edge and opening UPWARD: this sits
          // low on the intro screen next to "Play Welcome", so a downward menu
          // would open off the bottom of a phone viewport.
          className={cn(
            'absolute bottom-full right-0 mb-2 z-50 min-w-[11rem] py-1.5',
            'rounded-2xl bg-black/70 backdrop-blur-xl border border-white/20',
            'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
            'max-h-[60vh] overflow-y-auto',
          )}
        >
          {options.map((opt) => {
            const pres = LOCALE_PRESENTATION[opt.value];
            const isCurrent = opt.value === selectedLanguage;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isCurrent}
                onClick={() => {
                  setSelectedLanguage(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 text-start',
                  'text-sm text-white/90 hover:bg-white/15 transition-colors duration-150',
                  isCurrent && 'bg-white/10 font-semibold text-white',
                )}
              >
                {pres ? (
                  <img src={pres.flag} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                ) : (
                  // A GA locale with no presentation entry still appears, using
                  // its catalog label. Dropping it would hide a shipped language
                  // behind a missing image — the silent failure this component
                  // existed to cause.
                  <span className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{pres?.endonym ?? opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
