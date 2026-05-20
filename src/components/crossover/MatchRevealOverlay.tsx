/**
 * VTID-03107 · Match reveal overlay (soft-counter in v1).
 *
 * Wraps a match card. v1 ships with `locked` always false at the parent
 * (soft counter only). The locked path stays dark behind a future feature
 * flag — when ops decides to harden Find-a-Match reveals, they'll flip
 * the flag and this overlay starts rendering for over-quota users.
 *
 * Render shape when locked:
 *   - children rendered with `filter: blur(8px) opacity(0.4)` + pointer-events: none
 *   - overlay with "Unlock match" copy + "Use 1 credit" / "Upgrade" CTAs
 */

import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n-toast';
import { useSpendCredits } from '@/hooks/useBilling';
import { useToast } from '@/hooks/use-toast';
import type { ReactNode } from 'react';

interface MatchRevealOverlayProps {
  /** When true, blur the wrapped card and show the unlock overlay. Default false (soft-counter mode). */
  locked: boolean;
  /** Wrapped match card. */
  children: ReactNode;
  /** Optional match id for idempotency. */
  matchId?: string;
  /** Called after a successful credit-spend unlock. Parent typically refetches the match list. */
  onUnlocked?: () => void;
}

export function MatchRevealOverlay({ locked, children, matchId, onUnlocked }: MatchRevealOverlayProps) {
  const navigate = useNavigate();
  const spendCredits = useSpendCredits();
  const { toast } = useToast();

  if (!locked) {
    return <>{children}</>;
  }

  async function handleUseCredit() {
    try {
      const idempotencyKey = matchId
        ? `match_reveal:${matchId}`
        : `match_reveal:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const result = await spendCredits.mutateAsync({
        feature: 'match_reveals',
        units: 1,
        idempotencyKey,
      });
      if (result.ok) {
        toast({ description: t('paywall.creditsUsed') });
        onUnlocked?.();
      } else {
        toast({ description: t('paywall.creditsInsufficient'), variant: 'destructive' });
      }
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : t('paywall.creditsInsufficient'),
        variant: 'destructive',
      });
    }
  }

  function handleUpgrade() {
    navigate('/wallet/subscriptions?from=match-reveal');
  }

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        style={{ filter: 'blur(8px)', opacity: 0.4, pointerEvents: 'none' }}
      >
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 rounded-lg bg-background/80 backdrop-blur-sm"
        role="region"
        aria-label={t('paywall.match_reveals.title')}
      >
        <Lock className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="text-sm text-center font-medium">{t('paywall.match_reveals.title')}</p>
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleUseCredit}
            disabled={spendCredits.isPending}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Coins className="h-3 w-3 mr-1" aria-hidden="true" />
            {t('paywall.ctaCredits', { credits: 10 })}
          </Button>
          <Button onClick={handleUpgrade} size="sm" className="flex-1">
            <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
            {t('paywall.ctaUpgrade')}
          </Button>
        </div>
      </div>
    </div>
  );
}
