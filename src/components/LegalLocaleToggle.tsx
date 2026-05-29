import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/i18n-toast';
import type { LegalLang } from '@/lib/use-scoped-t';

function readEffectiveLang(
  urlLang: string | null,
  selectedLanguage: string,
): LegalLang {
  if (urlLang === 'de' || urlLang === 'en') return urlLang;
  return selectedLanguage.startsWith('de') ? 'de' : 'en';
}

export function LegalLocaleToggle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedLanguage } = useLanguage();
  const effective = readEffectiveLang(searchParams.get('lang'), selectedLanguage);

  const set = (lang: LegalLang) => {
    const next = new URLSearchParams(searchParams);
    next.set('lang', lang);
    setSearchParams(next, { replace: true });
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/80 p-0.5 text-xs shadow-sm"
      role="group"
      aria-label={t('screens.common.languageToggleAriaLabel')}
    >
      <button
        type="button"
        onClick={() => set('de')}
        aria-pressed={effective === 'de'}
        className={cn(
          'rounded-full px-2.5 py-1 font-semibold tracking-wide transition',
          effective === 'de'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        DE
      </button>
      <button
        type="button"
        onClick={() => set('en')}
        aria-pressed={effective === 'en'}
        className={cn(
          'rounded-full px-2.5 py-1 font-semibold tracking-wide transition',
          effective === 'en'
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        EN
      </button>
    </div>
  );
}
