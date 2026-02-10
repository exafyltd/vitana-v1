import { Button } from '@/components/ui/button';
import { useCreatorStatus, useCreatorOnboard } from '@/hooks/useCreator';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';

export function EnablePaymentsButton() {
  const { data: status, isLoading } = useCreatorStatus();
  const { mutate: startOnboarding, isPending } = useCreatorOnboard();

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking status...
      </Button>
    );
  }

  if (status?.charges_enabled && status?.payouts_enabled) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" />
        Payments Enabled
      </div>
    );
  }

  if (status?.stripe_account_id && !status?.charges_enabled) {
    return (
      <Button
        onClick={() => startOnboarding()}
        disabled={isPending}
        variant="outline"
        className="border-yellow-500 text-yellow-700 dark:text-yellow-400"
      >
        <CreditCard className="h-4 w-4" />
        {isPending ? 'Redirecting...' : 'Complete Setup'}
      </Button>
    );
  }

  return (
    <Button
      onClick={() => startOnboarding()}
      disabled={isPending}
      variant="default"
    >
      <CreditCard className="h-4 w-4" />
      {isPending ? 'Redirecting...' : 'Enable Payments'}
    </Button>
  );
}
