import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ShortsDensity } from '@/hooks/useShortsDensity';
import { Grid3x3, Grid2x2, LayoutGrid } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { t } from '@/lib/i18n-toast';

interface DensityControlProps {
  value: ShortsDensity;
  onChange: (value: ShortsDensity) => void;
}

export function DensityControl({ value, onChange }: DensityControlProps) {
  const { translate } = useTranslation();
  
  const densityOptions: { value: ShortsDensity; label: string; icon: React.ReactNode }[] = [
    { value: 'cozy', label: translate('densityOptions.cozy'), icon: <Grid2x2 className="w-3.5 h-3.5" /> },
    { value: 'compact', label: translate('densityOptions.compact'), icon: <Grid3x3 className="w-3.5 h-3.5" /> },
    { value: 'gallery', label: translate('densityOptions.gallery'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex items-center gap-2">
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ShortsDensity)}
        className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-lg"
        aria-label={t('screens.community.viewDensity')}
      >
        {densityOptions.map((option) => (
          <div key={option.value} className="relative">
            <RadioGroupItem
              value={option.value}
              id={`density-${option.value}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`density-${option.value}`}
              className={`
                cursor-pointer px-3 py-2 rounded-full text-xs font-semibold
                transition-all duration-300 ease-out
                flex items-center gap-1.5
                peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2
                ${
                  value === option.value
                    ? 'bg-gradient-to-r from-violet-500 to-sky-400 text-white shadow-md scale-105'
                    : 'text-foreground/70 hover:text-foreground hover:bg-white/20 hover:scale-105'
                }
              `}
            >
              {option.icon}
              <span>{option.label}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
