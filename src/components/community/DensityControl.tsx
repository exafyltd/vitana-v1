import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ShortsDensity } from '@/hooks/useShortsDensity';

interface DensityControlProps {
  value: ShortsDensity;
  onChange: (value: ShortsDensity) => void;
}

const densityOptions: { value: ShortsDensity; label: string }[] = [
  { value: 'cozy', label: 'Cozy' },
  { value: 'compact', label: 'Compact' },
  { value: 'gallery', label: 'Gallery' },
];

export function DensityControl({ value, onChange }: DensityControlProps) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as ShortsDensity)}
        className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg"
        aria-label="View density"
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
                cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium
                transition-all duration-200
                peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2
                ${
                  value === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }
              `}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
