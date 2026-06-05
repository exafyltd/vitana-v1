import { motion, useReducedMotion } from "framer-motion";
import { t } from "@/lib/i18n-toast";
import type { RingPhase } from "@/lib/goalPhases";

/**
 * The My Journey progress ring — shared by the North Star card and the plan
 * drawer. When `phases` + `totalDays` are supplied it renders one pastel band
 * per phase (elapsed bright, upcoming faded, marker at today); otherwise it
 * shows the single green→indigo gradient that fills by `pct`.
 */
export function GoalProgressRing({
  pct,
  day,
  daysLeft,
  size = 164,
  phases,
  currentDay,
  totalDays,
  daysLeftLabel,
}: {
  pct: number;
  day: number;
  daysLeft: number;
  size?: number;
  phases?: RingPhase[];
  currentDay?: number;
  totalDays?: number;
  /** Pre-translated countdown caption. Falls back to the "days left to your goal" string. */
  daysLeftLabel?: string;
}) {
  const reduce = useReducedMotion();
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const hasPhases = !!phases && phases.length > 1 && !!totalDays && totalDays > 0;
  const curFrac =
    hasPhases && currentDay != null ? Math.max(0, Math.min(1, currentDay / (totalDays as number))) : 0;

  // Point on the ring for a fraction (0 = top, clockwise).
  const pt = (frac: number): [number, number] => {
    const a = frac * 2 * Math.PI;
    return [cx + radius * Math.sin(a), cy - radius * Math.cos(a)];
  };
  const arc = (fA: number, fB: number, color: string, opacity: number, key: string) => {
    if (fB - fA <= 0.002) return null;
    const [x1, y1] = pt(fA);
    const [x2, y2] = pt(fB);
    const large = fB - fA > 0.5 ? 1 : 0;
    return (
      <path
        key={key}
        d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="butt"
        opacity={opacity}
      />
    );
  };

  // Single-gradient fallback geometry.
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference - (clamped / 100) * circumference;

  const GAP = 0.008; // small visual gap between phase bands

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* track */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-400/30" />

        {hasPhases ? (
          <>
            {phases!.flatMap((p, i) => {
              const t = totalDays as number;
              const sF = Math.min(1, p.start / t + (i > 0 ? GAP : 0));
              const eF = Math.max(sF, p.end / t - (i < phases!.length - 1 ? GAP : 0));
              const nodes: Array<JSX.Element | null> = [];
              if (curFrac > sF) nodes.push(arc(sF, Math.min(eF, curFrac), p.color, 1, `e${i}`));
              if (curFrac < eF) nodes.push(arc(Math.max(sF, curFrac), eF, p.color, 0.65, `u${i}`));
              return nodes;
            })}
            {/* today marker */}
            {(() => {
              const [mx, my] = pt(curFrac);
              return <circle cx={mx} cy={my} r={stroke / 2 + 1.5} fill="#ffffff" stroke="#475569" strokeWidth={2.5} />;
            })()}
          </>
        ) : (
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            <defs>
              <linearGradient id="goalprogress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            <motion.circle
              cx={cx}
              cy={cy}
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
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("screens.autopilotdashboard.dayLabel")}
        </span>
        <span className="text-4xl font-bold leading-none tracking-tight">{day}</span>
        <span className="text-[11px] text-muted-foreground mt-2">
          {daysLeftLabel ?? t("screens.autopilotdashboard.daysLeftCount", { days: daysLeft })}
        </span>
      </div>
    </div>
  );
}

export default GoalProgressRing;
