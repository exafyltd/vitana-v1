import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * VTID-05106 — thin top progress bar while a route switch is pending
 * (Spotlight contract SR-20: the old screen stays, no full-screen spinner).
 *
 * Shows only when the switch takes longer than `delayMs`, so instant
 * navigations never flicker. On completion it fills and fades out. Under
 * prefers-reduced-motion it appears and disappears without animation.
 * Decorative: screen readers already get the new page's focus/title.
 */
type Phase = 'idle' | 'running' | 'done';

export function NavProgressBar({ pending, delayMs = 150 }: { pending: boolean; delayMs?: number }) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (pending) {
      const show = setTimeout(() => setPhase('running'), delayMs);
      return () => clearTimeout(show);
    }
    setPhase((p) => (p === 'running' ? 'done' : 'idle'));
    return undefined;
  }, [pending, delayMs]);

  useEffect(() => {
    if (phase !== 'done') return undefined;
    const hide = setTimeout(() => setPhase('idle'), 250);
    return () => clearTimeout(hide);
  }, [phase]);

  if (phase === 'idle') return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden="true" data-testid="nav-progress" data-phase={phase}>
      <div
        className={cn(
          'h-full bg-primary motion-safe:transition-all motion-safe:ease-out',
          phase === 'running' ? 'w-3/4 motion-safe:duration-1000' : 'w-full opacity-0 motion-safe:duration-200',
        )}
      />
    </div>
  );
}
