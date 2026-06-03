import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { getCurrencySymbol, type DisplayCurrency } from '@/lib/exchangeRates';

interface CurrencyToggleProps {
  value: DisplayCurrency;
  onChange: (next: DisplayCurrency) => void;
  className?: string;
}

const OPTIONS: DisplayCurrency[] = ['USD', 'EUR'];

/**
 * Compact € / $ segmented switch shown on the cash balance card. Stops click
 * propagation so toggling never triggers the surrounding card's onClick.
 */
export function CurrencyToggle({ value, onChange, className }: CurrencyToggleProps) {
  const { translate } = useTranslation();

  return (
    <div
      role="group"
      aria-label={translate('wallet.displayCurrency')}
      className={cn(
        'inline-flex items-center rounded-full bg-background/60 p-0.5 text-xs font-semibold',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={value === opt}
          onClick={(e) => {
            e.stopPropagation();
            onChange(opt);
          }}
          className={cn(
            'h-6 w-7 rounded-full transition-colors',
            value === opt
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {getCurrencySymbol(opt)}
        </button>
      ))}
    </div>
  );
}
