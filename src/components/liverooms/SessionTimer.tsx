/**
 * VTID-03107 · Live Room session timer chip.
 *
 * Top-right floating chip showing mm:ss remaining on the host's session
 * budget. Color states:
 *   - neutral  (default) when remaining > 5 min
 *   - amber    when remaining <= 5 min
 *   - red      when remaining <= 1 min
 *
 * Pure prop-driven; the parent room session component owns the data
 * (Daily.co `app-message` listener publishes minutes_allowed + started_at).
 *
 * If `minutesAllowed` is null/Infinity (premium hosts with unlimited
 * within fair-use), the timer renders nothing.
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  /** Number of minutes the host's session is allowed to run. null = no cap (premium). */
  minutesAllowed: number | null;
  /** Unix timestamp (ms) when the host joined and the budget started counting. */
  startedAt: number;
  /** Optional callback fired exactly once when remaining hits 5 minutes. */
  onWarn5?: () => void;
  /** Optional callback fired exactly once when remaining hits 1 minute. */
  onWarn1?: () => void;
  /** Optional callback fired exactly once when remaining hits 0. */
  onExpire?: () => void;
}

function formatMmSs(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function SessionTimer({
  minutesAllowed,
  startedAt,
  onWarn5,
  onWarn1,
  onExpire,
}: SessionTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [warned5, setWarned5] = useState(false);
  const [warned1, setWarned1] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!minutesAllowed || !Number.isFinite(minutesAllowed)) {
      setRemainingSeconds(null);
      return;
    }
    const allowedMs = minutesAllowed * 60_000;
    function tick() {
      const elapsedMs = Date.now() - startedAt;
      const remaining = Math.max(0, Math.floor((allowedMs - elapsedMs) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 300 && !warned5) {
        setWarned5(true);
        onWarn5?.();
      }
      if (remaining <= 60 && !warned1) {
        setWarned1(true);
        onWarn1?.();
      }
      if (remaining <= 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [minutesAllowed, startedAt, warned5, warned1, expired, onWarn5, onWarn1, onExpire]);

  if (remainingSeconds === null) return null;

  const colorClass =
    remainingSeconds <= 60
      ? 'border-destructive bg-destructive/10 text-destructive'
      : remainingSeconds <= 300
        ? 'border-amber-500 bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-border bg-background/90 text-foreground';

  return (
    <div
      role="timer"
      aria-live={remainingSeconds <= 60 ? 'assertive' : 'off'}
      aria-label={`${formatMmSs(remainingSeconds)} remaining`}
      className={`absolute top-3 right-3 z-30 px-2.5 py-1 rounded-full border shadow-sm flex items-center gap-1.5 text-xs font-mono backdrop-blur-sm ${colorClass}`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      <span aria-hidden="true">{formatMmSs(remainingSeconds)}</span>
    </div>
  );
}
