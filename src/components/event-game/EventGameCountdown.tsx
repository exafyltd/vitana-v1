import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n-toast';

interface EventGameCountdownProps {
  endsAt: string;
  /** Fired once per threshold crossing (10min/5min/1min/over) — the caller
   * decides whether to show a notification banner for it. */
  onThreshold?: (kind: 'ten' | 'five' | 'one' | 'over') => void;
  className?: string;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Live countdown to `endsAt`. Small, self-contained, isolated — no
 * dedicated countdown component existed anywhere in this codebase before. */
export function EventGameCountdown({ endsAt, onThreshold, className }: EventGameCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(endsAt).getTime() - Date.now());
  const [lastThreshold, setLastThreshold] = useState<'ten' | 'five' | 'one' | 'over' | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    let next: 'ten' | 'five' | 'one' | 'over' | null = null;
    if (remainingMs <= 0) next = 'over';
    else if (remainingMs <= 60_000) next = 'one';
    else if (remainingMs <= 5 * 60_000) next = 'five';
    else if (remainingMs <= 10 * 60_000) next = 'ten';

    if (next && next !== lastThreshold) {
      setLastThreshold(next);
      onThreshold?.(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  if (remainingMs <= 0) {
    return <div className={className}>{t('eventGame.home.gameOver')}</div>;
  }

  return (
    <div className={className}>
      <span className="text-4xl font-extrabold tabular-nums bg-gradient-to-r from-[#6CC5EC] to-[#1B8FC7] bg-clip-text text-transparent">{formatRemaining(remainingMs)}</span>
      <span className="ml-2 text-sm text-muted-foreground uppercase tracking-wide">
        {t('eventGame.home.countdownLeft')}
      </span>
    </div>
  );
}
