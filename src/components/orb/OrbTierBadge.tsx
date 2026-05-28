/**
 * VTID-03107 · ORB voice tier badge.
 *
 * Tiny indicator showing the user's current voice tier (Live or Standard).
 * Flips to "Standard" when `vitana:orb-tier-downgraded` event fires; sticks
 * for the rest of the calendar day. Resets to "Live" automatically on next
 * SSE session (or page reload after midnight).
 *
 * Designed to be anchored on the orb widget itself. Subtle by default —
 * does not draw attention unless the user is actively looking at the orb.
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

const STORAGE_KEY_PREFIX = 'vitana:orb-tier-current:';

function todayKey(): string {
  const d = new Date();
  return `${STORAGE_KEY_PREFIX}${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

type Tier = 'live' | 'standard';

function readPersistedTier(): Tier {
  try {
    const v = localStorage.getItem(todayKey());
    return v === 'standard' ? 'standard' : 'live';
  } catch {
    return 'live';
  }
}

interface OrbTierBadgeProps {
  /** Force-hide when false (e.g. when the orb is idle and we don't want any badge). */
  visible?: boolean;
}

export function OrbTierBadge({ visible = true }: OrbTierBadgeProps) {
  const [tier, setTier] = useState<Tier>(() => readPersistedTier());

  useEffect(() => {
    function onTierDowngrade() {
      setTier('standard');
      try {
        localStorage.setItem(todayKey(), 'standard');
      } catch {
        // ignore
      }
    }
    window.addEventListener('vitana:orb-tier-downgraded', onTierDowngrade as EventListener);
    return () => {
      window.removeEventListener('vitana:orb-tier-downgraded', onTierDowngrade as EventListener);
    };
  }, []);

  if (!visible || tier === 'live') return null; // default-hidden when on Live

  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1.5 py-0 h-4 font-normal"
      aria-label={t('paywall.voice_live_minutes.title')}
    >
      <Sparkles className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
      Standard
    </Badge>
  );
}
