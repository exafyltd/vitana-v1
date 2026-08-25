import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage, getVisibleLanguageOptions } from '@/contexts/LanguageContext';
import { LOCALE_PRESENTATION } from './locale-presentation';

interface LanguageOptionsListProps {
  /** Called after a language is picked — hosts use this to close their popover/sheet. */
  onSelected?: () => void;
  className?: string;
}

/**
 * Flag + endonym + checkmark list of every visible (GA) language, reusing the
 * same `LOCALE_PRESENTATION` map and `getVisibleLanguageOptions()` filter as
 * the intro screen's picker. Theme-token styled (not the intro picker's dark
 * glass look) so it drops cleanly into ordinary app surfaces — the mobile
 * drawer's language row and the desktop sidebar's language control.
 */
export function LanguageOptionsList({ onSelected, className }: LanguageOptionsListProps) {
  const { selectedLanguage, setSelectedLanguage } = useLanguage();
  const options = getVisibleLanguageOptions();

  return (
    <div role="listbox" className={cn('flex flex-col gap-0.5', className)}>
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
              onSelected?.();
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start text-sm text-foreground',
              'hover:bg-muted transition-colors',
              isCurrent && 'bg-muted font-medium',
            )}
          >
            {pres ? (
              <img src={pres.flag} alt="" className="h-4 w-6 rounded-sm object-cover shrink-0" />
            ) : (
              // A GA locale with no presentation entry still appears, using its
              // catalog label — dropping it would hide a shipped language
              // behind a missing image.
              <span className="h-4 w-6 shrink-0" aria-hidden="true" />
            )}
            <span className="flex-1">{pres?.endonym ?? opt.label}</span>
            {isCurrent && <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
