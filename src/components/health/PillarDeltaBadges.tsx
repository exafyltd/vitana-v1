import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContributionVector, VitanaPillarKey } from "@/types/autopilot";
import { t } from '@/lib/i18n-toast';

const PILLAR_LABEL: Record<VitanaPillarKey, string> = {
  nutrition: "Nutrition",
  hydration: "Hydration",
  exercise: "Exercise",
  sleep: "Sleep",
  mental: "Mental",
};

const PILLAR_CLASS: Record<VitanaPillarKey, string> = {
  nutrition: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800",
  hydration: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:border-sky-800",
  exercise:  "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:border-rose-800",
  sleep:     "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-200 dark:border-indigo-800",
  mental:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800",
};

interface Props {
  vector?: ContributionVector | null;
  compact?: boolean;
  className?: string;
}

export function PillarDeltaBadges({ vector, compact = false, className }: Props) {
  if (!vector) return null;

  const entries = (Object.entries(vector) as Array<[VitanaPillarKey, number]>)
    .filter(([pillar, value]) => PILLAR_LABEL[pillar] && typeof value === "number" && value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap gap-1 items-center", className)}
      role="list"
      aria-label={t('screens.health.vitanaIndexPillarImpact')}
    >
      {entries.map(([pillar, value]) => (
        <Badge
          key={pillar}
          variant="outline"
          className={cn(
            "border px-1.5 py-0",
            compact ? "text-[10px] leading-4" : "text-xs",
            PILLAR_CLASS[pillar],
          )}
          role="listitem"
          title={`Completing this action contributes +${value} to your ${PILLAR_LABEL[pillar]} pillar on the Vitana Index.`}
        >
          {compact ? PILLAR_LABEL[pillar].slice(0, 4) : PILLAR_LABEL[pillar]} +{value}
        </Badge>
      ))}
    </div>
  );
}
