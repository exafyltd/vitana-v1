import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface DelayedLoaderProps {
  /**
   * Reveal the spinner only after this many ms of loading (default 400).
   * Fast loads finish before the timer fires, so no spinner ever flashes;
   * slow loads surface a spinner well within ~1s of feedback.
   */
  delayMs?: number;
  /** Cover the full viewport (used as a whole-screen gate) instead of a region. */
  fullscreen?: boolean;
  className?: string;
}

/**
 * Clean loading placeholder that obeys the product rule: never flash a
 * half-built or intermediate screen. It paints an empty app-background panel
 * immediately and fades in a centered spinner only if the load runs longer
 * than `delayMs`.
 */
export function DelayedLoader({ delayMs = 400, fullscreen = false, className }: DelayedLoaderProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSpinner(true), delayMs);
    return () => window.clearTimeout(id);
  }, [delayMs]);

  return (
    <div
      className={`flex w-full items-center justify-center bg-background ${
        fullscreen ? 'min-h-screen' : 'min-h-[60vh]'
      } ${className ?? ''}`}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={`h-8 w-8 animate-spin text-primary transition-opacity duration-300 ${
          showSpinner ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

export default DelayedLoader;
