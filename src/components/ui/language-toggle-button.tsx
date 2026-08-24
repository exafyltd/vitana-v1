import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLanguage, getVisibleLanguageOptions } from '@/contexts/LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';
// `t` from i18n-toast is a plain function-call lookup and would shadow the
// `useTranslation()` catalog-object `t` used elsewhere in this file, so it's
// imported under an alias — same pattern IntroExperience.tsx uses (there
// aliased `lookup`) for the identical reason.
import { t as i18nT } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

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
 * Language picker for the intro/landing screen: a glass pill (globe icon +
 * current language name + chevron) that opens a full-screen Drawer listing
 * every visible language with a flag, its endonym, and a checkmark on the
 * current selection.
 *
 * The list comes from `getVisibleLanguageOptions()` — the same GA filter the
 * settings picker uses, including its `?i18n-preview=1` override for beta/
 * draft locales. It is deliberately NOT a second copy of the language list:
 * promoting a locale to `ga` must light it up here with no edit to this file.
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
}

export function LanguageToggleButton({ className }: LanguageToggleButtonProps) {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const options = getVisibleLanguageOptions();
  const current = LOCALE_PRESENTATION[selectedLanguage] ?? LOCALE_PRESENTATION['de-DE'];

  // With a single language configured there is nothing to choose. Render the
  // pill as a plain, non-interactive badge rather than a button that opens an
  // empty drawer.
  const isInteractive = options.length > 1;

  const triggerClasses = cn(
    'w-full flex items-center justify-center gap-3',
    'bg-white/10 backdrop-blur-xl border border-white/30 rounded-2xl',
    'px-8 py-5 text-base font-semibold text-white',
    'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
    'transition-all duration-300',
    isInteractive && 'hover:bg-white/20',
    isInteractive &&
      'hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    className,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => isInteractive && setDrawerOpen(true)}
        className={triggerClasses}
        aria-label={t.intro?.chooseLanguage || 'Choose language'}
        aria-haspopup={isInteractive ? 'dialog' : undefined}
        disabled={!isInteractive}
      >
        <img
          src={current.flag}
          alt=""
          className="w-9 h-6 rounded object-cover flex-shrink-0 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
        />
        <span className="flex-1 text-start">{current.endonym}</span>
        <ChevronDown className="w-5 h-5 text-white/70 flex-shrink-0" aria-hidden="true" />
      </button>

      {/* Dark glass styling, overridden locally rather than in the shared
          drawer.tsx primitive (used elsewhere in ordinary light contexts).
          DrawerContent's default bg-background resolves to plain white in
          this app's light theme, and nothing forces dark mode on the intro
          screen, so without this the picker slides up as a flat white sheet
          over the screen's dark photo background — the "too basic" gap
          against the reference mockup's dark glass panel. */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent
          overlayClassName="bg-black/60"
          className="bg-[#161311]/95 backdrop-blur-2xl border-white/10 text-white"
        >
          <DrawerHeader>
            <DrawerTitle className="text-white">
              {t.intro?.chooseLanguageTitle || 'Choose your language'}
            </DrawerTitle>
            <DrawerDescription className="text-white/60">
              {t.intro?.chooseLanguageSubtitle ||
                'Vitana will speak and respond in this language.'}
            </DrawerDescription>
          </DrawerHeader>

          <div
            role="listbox"
            aria-label={t.intro?.chooseLanguageTitle || 'Choose your language'}
            className="px-2 pb-2 max-h-[60vh] overflow-y-auto"
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
                  // VTID-03705 — picking IS committing. The tap already applied
                  // the language (it always did); what made it feel like a
                  // two-step confirmation was that the drawer stayed open
                  // afterwards behind a "Done" button, so the choice looked
                  // pending until you pressed it. Closing here is the whole
                  // fix, and it removes the reason for that footer button.
                  onClick={() => {
                    setSelectedLanguage(opt.value);
                    setDrawerOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-start text-white',
                    'hover:bg-white/10 transition-colors',
                    isCurrent && 'bg-white/10 font-semibold',
                  )}
                >
                  {pres ? (
                    <img
                      src={pres.flag}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    // A GA locale with no presentation entry still appears, using
                    // its catalog label. Dropping it would hide a shipped language
                    // behind a missing image — the silent failure this component
                    // existed to cause.
                    <span className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className="flex-1">{pres?.endonym ?? opt.label}</span>
                  {isCurrent && (
                    <Check
                      className="w-4 h-4 text-[#E0AA52] flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* VTID-03705 — the primary "Done" button is gone on purpose.
              Selecting a language now applies it and closes the drawer, so a
              confirm step would confirm something already done, and a gold
              primary button next to a completed action reads as "your choice
              is not saved yet". What replaces it is a plain dismissal for the
              person who opened the picker and decided to keep their current
              language — that case still needs a way out, and relying only on
              the swipe-down/overlay-tap gestures would leave keyboard and
              screen-reader users without an obvious one. */}
          <DrawerFooter>
            <Button
              variant="ghost"
              className="w-full text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setDrawerOpen(false)}
            >
              {i18nT('screens.common.close')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
