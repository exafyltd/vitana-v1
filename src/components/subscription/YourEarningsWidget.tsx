/**
 * VTID-03107 · "Your Earnings" widget.
 *
 * Honest, read-only. Only renders for users with non-zero earnings history.
 * For Free / new users: returns null — no projected-earnings copy.
 *
 * Reads `data.earnings.year_in_cents` + `data.wallet.cash_balance` from
 * /billing/me.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { useOpenPortal, type useBilling } from '@/hooks/useBilling';

type BillingData = NonNullable<ReturnType<typeof useBilling>['data']>;

interface YourEarningsWidgetProps {
  data: BillingData;
}

export function YourEarningsWidget({ data }: YourEarningsWidgetProps) {
  const earnedCents = data.earnings.year_in_cents;
  const cashBalanceCents = data.wallet.cash_balance;

  // Conditional rendering: hide entirely when there's nothing to show
  if (earnedCents === 0 && cashBalanceCents === 0) {
    return null;
  }

  const portal = useOpenPortal();

  async function handleWithdraw() {
    try {
      const result = await portal.mutateAsync();
      if (result.url) window.open(result.url, '_blank');
    } catch {
      // billingFetch already surfaced
    }
  }

  const earnedEur = earnedCents / 100;
  const cashEur = cashBalanceCents / 100;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-900/10">
      <CardContent className="p-5 space-y-3">
        <h3 className="font-semibold text-sm">{t('billing.earnings.title')}</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('billing.earnings.youEarned')}</dt>
            <dd className="font-mono">€{fmtNumber(earnedEur, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <dt className="font-medium">{t('billing.earnings.net')}</dt>
            <dd className="font-mono font-bold">€{fmtNumber(cashEur, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
          </div>
        </dl>
        {cashEur > 0 && (
          <Button onClick={handleWithdraw} disabled={portal.isPending} variant="outline" size="sm" className="w-full">
            {t('billing.earnings.withdraw')}
            <ArrowUpRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
