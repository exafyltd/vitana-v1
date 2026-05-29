/**
 * VTID-03107 · ORB voice tier-downgrade banner.
 *
 * Listens for `vitana:orb-tier-downgraded` window events (dispatched by
 * src/lib/OrbVoiceClient.ts when the backend SSE emits 'orb.tier.downgraded').
 * Shows a single warm banner explaining the user's session has moved to
 * Standard voice mode — not an error. Auto-dismisses after 12s. Caches a
 * "seen today" flag in localStorage so we don't nag every session in the
 * same calendar day.
 *
 * Mount once at the orb widget level (next to the floating orb component).
 * Independent of routes.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';

const STORAGE_KEY_PREFIX = 'vitana:orb-degrade-banner-seen:';
const AUTO_DISMISS_MS = 12_000;

interface TierDowngradeDetail {
  new_tier?: string;
  reason?: string;
  feature?: string;
}

function todayKey(): string {
  const d = new Date();
  return `${STORAGE_KEY_PREFIX}${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

export function OrbDegradeBanner() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onTierDowngrade(e: Event) {
      const ce = e as CustomEvent<TierDowngradeDetail>;
      // Only show for actual standard-tier transitions
      const newTier = ce.detail?.new_tier;
      if (newTier !== 'standard') return;
      // Suppress if already shown this calendar day
      try {
        if (localStorage.getItem(todayKey())) return;
        localStorage.setItem(todayKey(), '1');
      } catch {
        // localStorage unavailable — show anyway
      }
      setVisible(true);
    }
    window.addEventListener('vitana:orb-tier-downgraded', onTierDowngrade as EventListener);
    return () => {
      window.removeEventListener('vitana:orb-tier-downgraded', onTierDowngrade as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handle = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(handle);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 z-50 max-w-sm rounded-lg border bg-card shadow-lg p-3 pr-2 flex items-center gap-3 animate-in slide-in-from-bottom-5"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-tight">{t('paywall.voice_live_minutes.title')}</p>
        <p className="text-xs text-muted-foreground leading-tight">{t('paywall.voice_live_minutes.body')}</p>
      </div>
      <div className="flex flex-col gap-1 items-stretch">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setVisible(false);
            navigate('/wallet/subscriptions?from=orb-degrade');
          }}
        >
          {t('paywall.ctaUpgrade')}
        </Button>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label={t('paywall.ctaLater')}
        className="absolute top-1 right-1 p-1 rounded hover:bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
