/**
 * VTID-03107 · Plans grid — headline tier choice (Free + Premium).
 *
 * Lead with just the binary decision 95% of users face. The Host + Community
 * plans live behind a disclosure (see PlansGridExpanded).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { useStartSubscriptionCheckout } from '@/hooks/useBilling';

interface PlansGridHeadlineProps {
  currentPlanKey: string;
  /** When true, hide the "Get started" CTAs because user is already paid */
  hideCta?: boolean;
}

type Interval = 'month' | 'year';

const PREMIUM_PRICE_CENTS: Record<Interval, number> = { month: 999, year: 8900 };

export function PlansGridHeadline({ currentPlanKey, hideCta }: PlansGridHeadlineProps) {
  const [interval, setInterval] = useState<Interval>('month');
  const checkout = useStartSubscriptionCheckout();

  const isFreeCurrent = currentPlanKey === 'free';

  async function handleChoosePremium() {
    try {
      const priceKey = interval === 'month' ? 'premium_monthly' : 'premium_annual';
      const result = await checkout.mutateAsync({ priceKey });
      if (result.url) window.location.assign(result.url);
    } catch {
      // billingFetch already surfaced the error
    }
  }

  const priceEur = PREMIUM_PRICE_CENTS[interval] / 100;

  return (
    <section aria-labelledby="plans-headline">
      <header className="flex items-center justify-between mb-3">
        <h2 id="plans-headline" className="text-lg font-semibold">
          {t('billing.plans.headlineSection')}
        </h2>
        <div role="tablist" aria-label="Billing interval" className="inline-flex rounded-md bg-muted p-0.5 text-xs">
          <button
            role="tab"
            aria-selected={interval === 'month'}
            onClick={() => setInterval('month')}
            className={`px-3 py-1 rounded ${interval === 'month' ? 'bg-background shadow-sm' : ''}`}
          >
            {t('billing.plans.perMonth').replace('/', '')}
          </button>
          <button
            role="tab"
            aria-selected={interval === 'year'}
            onClick={() => setInterval('year')}
            className={`px-3 py-1 rounded ${interval === 'year' ? 'bg-background shadow-sm' : ''}`}
          >
            {t('billing.plans.perYear').replace('/', '')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free card */}
        <Card className={isFreeCurrent ? 'border-primary/40' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('billing.plans.free.name')}</span>
              {isFreeCurrent && <Badge variant="secondary">{t('billing.plans.currentPlan')}</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('billing.plans.free.tagline')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold">{t('billing.plans.free.price')}</div>
            <ul className="space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.voiceLive')} · 15 {t('billing.features.voiceLiveUnit')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.liveRooms')} · 40 min/mo · 1 session</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.storage')} · 100 MB</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Premium card */}
        <Card className={currentPlanKey === 'premium' ? 'border-primary' : 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent'}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('billing.plans.premium.name')}</span>
              {currentPlanKey === 'premium' && <Badge variant="default">{t('billing.plans.currentPlan')}</Badge>}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('billing.plans.premium.tagline')}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-3xl font-bold">
                €{fmtNumber(priceEur, { maximumFractionDigits: 2 })}
                <span className="text-sm font-normal text-muted-foreground">
                  {interval === 'month' ? t('billing.plans.perMonth') : t('billing.plans.perYear')}
                </span>
              </div>
              {interval === 'year' && (
                <Badge variant="secondary" className="mt-1">{t('billing.plans.saveAnnual')}</Badge>
              )}
            </div>
            <ul className="space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.voiceLive')} · 30 {t('billing.features.voiceLiveUnit')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.liveRooms')} · 5 {t('billing.features.liveRoomsUnit')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.storage')} · 5 GB</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5" aria-hidden="true" />
                <span>{t('billing.features.priorityPractitioner')}</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">{t('billing.plans.trial14')}</p>
            {!hideCta && currentPlanKey !== 'premium' && (
              <Button onClick={handleChoosePremium} disabled={checkout.isPending} className="w-full">
                {t('billing.plans.selectPlan')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
