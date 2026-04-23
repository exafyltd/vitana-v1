import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SegmentedControlSize = "sm" | "md";

interface Segment<T extends string> {
  id: T;
  label: string;
}

interface ProfileIdSegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: SegmentedControlSize;
  className?: string;
}

const SIZE_STYLES: Record<
  SegmentedControlSize,
  { containerMaxW: string; button: string }
> = {
  sm: { containerMaxW: "max-w-xs", button: "py-2 text-xs" },
  md: { containerMaxW: "max-w-md", button: "py-2.5 text-sm" },
};

function getPosition(index: number, total: number): { left: string; width: string } {
  const pct = 100 / total;
  if (index === 0) {
    return { left: "4px", width: `calc(${pct}% - 3px)` };
  }
  if (index === total - 1) {
    return { left: `calc(${pct * index}% - 2px)`, width: `calc(${pct}% - 3px)` };
  }
  return { left: `calc(${pct * index}% + 1px)`, width: `calc(${pct}% - 3px)` };
}

export function ProfileIdSegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = "sm",
  className,
}: ProfileIdSegmentedControlProps<T>) {
  const activeIndex = segments.findIndex((s) => s.id === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const sizeStyle = SIZE_STYLES[size];

  return (
    <div className={cn("flex justify-center", className)}>
      <div
        className={cn(
          "relative flex p-1 rounded-full border border-black/5 dark:border-white/10 w-full bg-white/70 dark:bg-white/5 backdrop-blur-sm",
          sizeStyle.containerMaxW
        )}
        style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)" }}
      >
        <motion.div
          className="absolute top-1 bottom-1 rounded-full"
          style={{
            background:
              "linear-gradient(135deg, hsl(240, 70%, 90%) 0%, hsl(210, 70%, 88%) 100%)",
            boxShadow: "0 1px 3px rgba(99, 102, 241, 0.18)",
          }}
          initial={false}
          animate={getPosition(safeIndex, segments.length)}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />

        {segments.map((segment) => {
          const isActive = segment.id === value;
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => onChange(segment.id)}
              aria-pressed={isActive}
              className={cn(
                "relative z-10 flex-1 font-semibold tracking-wide transition-colors duration-200",
                sizeStyle.button,
                isActive ? "text-foreground" : "text-foreground/60 hover:text-foreground/80"
              )}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
