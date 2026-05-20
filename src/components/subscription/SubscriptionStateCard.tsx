/**
 * VTID-03107 · Current subscription state hero card.
 *
 * Mirrors the pattern of CreatorPaymentsSection (status badge + conditional
 * CTA). Three visual states:
 *   - Free: white card, "Try Premium" CTA
 *   - Active paid: green badge + renewal date + Manage button (opens portal)
 *   - Past due: red border + Update payment CTA
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CreditCard, AlertCircle, Check } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { fmtDate } from '@/lib/locale-format';
import { useOpenPortal, type useBilling } from '@/hooks/useBilling';

type BillingData = NonNullable<ReturnType<typeof useBilling>['data']>;

interface SubscriptionStateCardProps {
  data: BillingData;
}

export function SubscriptionStateCard({ data }: SubscriptionStateCardProps) {
  const navigate = useNavigate();
  const openPortal = useOpenPortal();
  const plan = data.plan;
  const isFree = plan.plan_key === 'free' || plan.status === 'free';
  const isPastDue = plan.status === 'past_due' || plan.status === 'unpaid';
  const isTrialing = plan.status === 'trialing';
  const isCanceled = plan.status === 'canceled';

  async function handleManage() {
    try {
      const result = await openPortal.mutateAsync();
      if (result.url) window.location.assign(result.url);
    } catch {
      // billingFetch already surfaced the error
    }
  }

  function handleSeePlans() {
    navigate('/wallet/subscriptions');
  }

  if (isFree) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('billing.state.freeStatus')}</span>
            <Badge variant="secondary">{t('billing.plans.free.name')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('billing.state.freeBody')}</p>
          <Button onClick={handleSeePlans} className="w-full">
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('billing.state.viewPlans')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isPastDue) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('billing.state.pastDue')}</span>
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
              {plan.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('billing.state.pastDueBody')}</p>
          <Button onClick={handleManage} disabled={openPortal.isPending} className="w-full" variant="destructive">
            <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('billing.state.manage')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active or trialing paid plan
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('billing.state.premiumActive')}</span>
          <Badge variant="default">
            <Check className="h-3 w-3 mr-1" aria-hidden="true" />
            {isTrialing ? t('billing.state.trialingBadge') : t('billing.state.activeBadge')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isTrialing && plan.trial_end && (
          <p className="text-sm text-muted-foreground">
            {t('billing.state.trialEndsAt', { date: fmtDate(new Date(plan.trial_end)) })}
          </p>
        )}
        {!isTrialing && plan.current_period_end && (
          <p className="text-sm text-muted-foreground">
            {plan.cancel_at_period_end
              ? t('billing.state.cancelAtPeriodEnd')
              : t('billing.state.renewsAt', { date: fmtDate(new Date(plan.current_period_end)) })}
          </p>
        )}
        <Button
          onClick={handleManage}
          disabled={openPortal.isPending || isCanceled}
          className="w-full"
          variant="outline"
        >
          <CreditCard className="h-4 w-4 mr-2" aria-hidden="true" />
          {t('billing.state.manage')}
        </Button>
      </CardContent>
    </Card>
  );
}
