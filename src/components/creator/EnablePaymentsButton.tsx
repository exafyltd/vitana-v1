/**
 * Enable Payments Button - Stripe Connect Onboarding
 * VTID-01230: Creator onboarding UI
 */

import { Button } from '@/components/ui/button';
import { useCreatorStatus, useCreatorOnboard } from '@/hooks/useCreator';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

export function EnablePaymentsButton() {
  const { data: status, isLoading } = useCreatorStatus();
  const { mutate: startOnboarding, isPending } = useCreatorOnboard();

  if (isLoading) {
    return (
      <Button disabled variant="outline">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking status...
      </Button>
    );
  }

  // Already fully onboarded
  if (status?.charges_enabled && status?.payouts_enabled) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <CheckCircle className="w-4 h-4" />
        <span className="font-medium">{t('screens.creator.paymentsEnabled')}</span>
      </div>
    );
  }

  // Partially onboarded (needs to complete)
  if (status?.stripe_account_id && !status?.charges_enabled) {
    return (
      <Button 
      onClick={() => startOnboarding(undefined)}
        disabled={isPending}
        variant="outline"
        className="border-yellow-500 text-yellow-700"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {isPending ? 'Redirecting...' : 'Complete Setup'}
      </Button>
    );
  }

  // Not onboarded at all
  return (
    <Button 
      onClick={() => startOnboarding(undefined)}
      disabled={isPending}
      variant="default"
    >
      <CreditCard className="w-4 h-4 mr-2" />
      {isPending ? 'Redirecting...' : 'Enable Payments'}
    </Button>
  );
}
