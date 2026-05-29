/**
 * VTID-03107 · Billing v1 — Paywall modal
 *
 * Single parametric modal triggered by the global paywall event (via
 * PaywallProvider). Copy strings come from i18n shards under `paywall.*`
 * — never hardcoded.
 *
 * CTA layout per §O canonical copy:
 *   - voice_live_minutes:  Continue in Standard mode (primary) · Add live minutes · Upgrade
 *   - live_room_minutes:   Add hosting time (primary) · Upgrade · Wrap up
 *   - default:             Unlock Premium (primary) · Use {N} credits (secondary, only if balance sufficient) · Maybe later
 *
 * D36-aware: this modal NEVER opens for `deferred_for_vulnerability` payloads
 * — the billing fetch wrapper handles that case with a soft toast instead.
 */

import { useNavigate } from 'react-router-dom';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Mic, Radio, Users, Eye, FlaskConical, Camera, Sparkles, Lock } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import type { PaywallPayload } from '@/lib/billingApi';
import { useSpendCredits } from '@/hooks/useBilling';
import { useToast } from '@/hooks/use-toast';

interface PaywallModalProps {
  payload: PaywallPayload | null;
  onOpenChange: (open: boolean) => void;
}

function getCopyKey(feature: string): string {
  // Map feature_key → i18n namespace. Falls back to 'default'.
  switch (feature) {
    case 'voice_live_minutes':
    case 'live_room_minutes':
    case 'match_posts':
    case 'match_reveals':
    case 'lab_analyses':
    case 'photo_uploads':
    case 'memory_garden':
    case 'autopilot':
      return feature;
    default:
      return 'default';
  }
}

function getFeatureIcon(feature: string) {
  switch (feature) {
    case 'voice_live_minutes':
      return Mic;
    case 'live_room_minutes':
      return Radio;
    case 'match_posts':
      return Users;
    case 'match_reveals':
      return Eye;
    case 'lab_analyses':
      return FlaskConical;
    case 'photo_uploads':
      return Camera;
    case 'autopilot':
      return Sparkles;
    default:
      return Lock;
  }
}

export function PaywallModal({ payload, onOpenChange }: PaywallModalProps) {
  const navigate = useNavigate();
  const spendCredits = useSpendCredits();
  const { toast } = useToast();
  const open = !!payload;

  if (!payload) {
    return (
      <ResponsiveDialog open={false} onOpenChange={onOpenChange}>
        <div />
      </ResponsiveDialog>
    );
  }

  const copyKey = getCopyKey(payload.feature);
  const Icon = getFeatureIcon(payload.feature);

  const titleKey = `paywall.${copyKey}.title`;
  const bodyKey = `paywall.${copyKey}.body`;
  const creditCost = payload.credit_cost_per_unit;
  const canPayWithCredits =
    !!payload.credit_option && payload.credit_option.balance_sufficient_for_one_unit;
  const isVoiceFeature = payload.feature === 'voice_live_minutes';
  const isRoomFeature = payload.feature === 'live_room_minutes';

  const usedPct = payload.quota > 0 ? Math.min(100, (payload.used / payload.quota) * 100) : 100;

  function handleUpgrade() {
    onOpenChange(false);
    navigate(`/wallet/subscriptions?from=paywall&feature=${encodeURIComponent(payload.feature)}`);
  }

  async function handleSpendCredits() {
    try {
      const result = await spendCredits.mutateAsync({
        feature: payload.feature,
        units: 1,
      });
      if (result.ok) {
        toast({ description: t('paywall.creditsUsed') });
        onOpenChange(false);
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

  function handleDismiss() {
    onOpenChange(false);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-3 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <ResponsiveDialogTitle>{t(titleKey)}</ResponsiveDialogTitle>
          </div>
          <ResponsiveDialogDescription>{t(bodyKey)}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Mini usage indicator */}
        {payload.quota > 0 && (
          <div className="px-1 py-2 space-y-2">
            <Progress value={usedPct} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              <span className="sr-only">{t('paywall.remainingCounter', { remaining: payload.remaining, limit: payload.quota })}</span>
              <span aria-hidden="true">
                {payload.used} / {payload.quota}
              </span>
            </p>
          </div>
        )}

        <ResponsiveDialogFooter className="flex flex-col gap-2 sm:flex-col">
          {/* Voice paywall: primary is "Continue in Standard mode" — graceful degrade */}
          {isVoiceFeature && (
            <>
              <Button onClick={handleDismiss} className="w-full" variant="default">
                {t('paywall.voice_live_minutes.stayInStandard')}
              </Button>
              {canPayWithCredits && (
                <Button onClick={handleSpendCredits} className="w-full" variant="outline" disabled={spendCredits.isPending}>
                  {t('paywall.voice_live_minutes.addMinutes')}
                </Button>
              )}
              <Button onClick={handleUpgrade} className="w-full" variant="ghost">
                {t('paywall.ctaUpgrade')}
              </Button>
            </>
          )}

          {/* Live Room paywall: primary is "Add hosting time" — active hosts want to keep going */}
          {isRoomFeature && (
            <>
              {canPayWithCredits && (
                <Button onClick={handleSpendCredits} className="w-full" variant="default" disabled={spendCredits.isPending}>
                  {t('paywall.live_room_minutes.addTime')}
                </Button>
              )}
              <Button onClick={handleUpgrade} className="w-full" variant="outline">
                {t('paywall.ctaUpgrade')}
              </Button>
              <Button onClick={handleDismiss} className="w-full" variant="ghost">
                {t('paywall.live_room_minutes.wrapUp')}
              </Button>
            </>
          )}

          {/* Default paywall layout */}
          {!isVoiceFeature && !isRoomFeature && (
            <>
              <Button onClick={handleUpgrade} className="w-full" variant="default">
                {t('paywall.ctaUpgrade')}
              </Button>
              {canPayWithCredits && (
                <Button onClick={handleSpendCredits} className="w-full" variant="outline" disabled={spendCredits.isPending}>
                  {t('paywall.ctaCredits', { credits: creditCost })}
                </Button>
              )}
              <Button onClick={handleDismiss} className="w-full" variant="ghost">
                {t('paywall.ctaLater')}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
