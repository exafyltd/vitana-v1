import { motion, useReducedMotion } from "framer-motion";
import { t } from "@/lib/i18n-toast";

/**
 * The My Journey progress ring — a single source of truth used by both the
 * North Star card and the plan drawer for visual consistency. Fills by `pct`
 * (time-to-deadline) and shows the current day + days-left in the center.
 */
export function GoalProgressRing({
  pct,
  day,
  daysLeft,
  size = 164,
}: {
  pct: number;
  day: number;
  daysLeft: number;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/30"
        />
        <defs>
          <linearGradient id="goalprogress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#goalprogress-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduce ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reduce ? 0 : 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("screens.autopilotdashboard.dayLabel")}
        </span>
        <span className="text-4xl font-bold leading-none tracking-tight">{day}</span>
        <span className="text-[11px] text-muted-foreground mt-2">
          {t("screens.autopilotdashboard.daysLeftCount", { days: daysLeft })}
        </span>
      </div>
    </div>
  );
}

export default GoalProgressRing;
