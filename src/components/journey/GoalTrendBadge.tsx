import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import type { GoalTrend } from "@/lib/goalTrend";

/**
 * Directional schedule-adherence badge for the goal: green ↑ on track,
 * amber → stagnating, red ↓ falling behind. Shown under the North Star ring
 * and at the top of the plan drawer.
 */
export function GoalTrendBadge({ trend, className = "" }: { trend: GoalTrend; className?: string }) {
  const Icon = trend === "up" ? ArrowUp : trend === "flat" ? ArrowRight : ArrowDown;
  const tint =
    trend === "up"
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      : trend === "flat"
      ? "text-amber-600 bg-amber-500/10 border-amber-500/20"
      : "text-rose-600 bg-rose-500/10 border-rose-500/20";
  const label =
    trend === "up"
      ? t("screens.autopilotdashboard.trendOnTrack")
      : trend === "flat"
      ? t("screens.autopilotdashboard.trendStagnating")
      : t("screens.autopilotdashboard.trendBehind");
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${tint} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export default GoalTrendBadge;
