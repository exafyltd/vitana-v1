import { cn } from "@/lib/utils";

export interface PillarOption {
  value: string;
  label: string;
}

interface PillarFilterProps {
  options: PillarOption[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillarFilter({ options, active, onChange, className }: PillarFilterProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-none py-1 -mx-1 px-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
            active === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
