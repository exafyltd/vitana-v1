/**
 * VTID-03107 · Plans grid — Host + Community tier disclosure.
 *
 * Collapsed by default. Reveals when user clicks "Need more live time or
 * hosting?" Most users don't need to see these two cards.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Crown } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { fmtNumber } from '@/lib/locale-format';
import { useStartSubscriptionCheckout } from '@/hooks/useBilling';

const HOST_MONTHLY = 9900;
const HOST_ANNUAL = 89000;
const COMMUNITY_MONTHLY = 19900;
const COMMUNITY_ANNUAL = 199000;

interface PlansGridExpandedProps {
  currentPlanKey: string;
}

type Interval = 'month' | 'year';

export function PlansGridExpanded({ currentPlanKey }: PlansGridExpandedProps) {
  const [expanded, setExpanded] = useState(currentPlanKey === 'premium_5x' || currentPlanKey === 'premium_20x');
  const [interval, setInterval] = useState<Interval>('month');
  const checkout = useStartSubscriptionCheckout();

  async function handleChoose(planKey: 'premium_5x' | 'premium_20x') {
    try {
      const priceKey =
        planKey === 'premium_5x'
          ? interval === 'month' ? 'premium_5x_monthly' : 'premium_5x_annual'
          : interval === 'month' ? 'premium_20x_monthly' : 'premium_20x_annual';
      const result = await checkout.mutateAsync({ priceKey });
      if (result.url) window.location.assign(result.url);
    } catch {
      // billingFetch already surfaced
    }
  }

  const hostPriceEur = (interval === 'month' ? HOST_MONTHLY : HOST_ANNUAL) / 100;
  const communityPriceEur = (interval === 'month' ? COMMUNITY_MONTHLY : COMMUNITY_ANNUAL) / 100;

  return (
    <section aria-labelledby="plans-expanded-anchor">
      <Card>
        <CardHeader>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={expanded}
            aria-controls="plans-expanded-content"
          >
            <div>
              <CardTitle id="plans-expanded-anchor" className="text-base">
                {t('billing.plans.needMoreTitle')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t('billing.plans.needMoreBody')}</p>
            </div>
            {expanded ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
          </button>
        </CardHeader>

        {expanded && (
          <CardContent id="plans-expanded-content" className="space-y-4">
            <div className="flex justify-end">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Host (premium_5x) */}
              <Card className={currentPlanKey === 'premium_5x' ? 'border-primary' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t('billing.plans.premium_5x.name')}</h3>
                    <Badge variant="outline">{t('billing.plans.premium_5x.ribbon')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('billing.plans.premium_5x.tagline')}</p>
                  <div className="text-2xl font-bold">
                    €{fmtNumber(hostPriceEur, { maximumFractionDigits: 0 })}
                    <span className="text-sm font-normal text-muted-foreground">
                      {interval === 'month' ? t('billing.plans.perMonth') : t('billing.plans.perYear')}
                    </span>
                  </div>
                  {currentPlanKey !== 'premium_5x' && (
                    <Button onClick={() => handleChoose('premium_5x')} disabled={checkout.isPending} variant="outline" className="w-full">
                      {t('billing.plans.selectPlan')}
                    </Button>
                  )}
                  {currentPlanKey === 'premium_5x' && (
                    <Badge variant="default" className="w-full justify-center">{t('billing.plans.currentPlan')}</Badge>
                  )}
                </CardContent>
              </Card>

              {/* Community (premium_20x) */}
              <Card className={currentPlanKey === 'premium_20x' ? 'border-primary' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-1">
                      <Crown className="h-4 w-4" aria-hidden="true" />
                      {t('billing.plans.premium_20x.name')}
                    </h3>
                    <Badge variant="outline">{t('billing.plans.premium_20x.ribbon')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('billing.plans.premium_20x.tagline')}</p>
                  <div className="text-2xl font-bold">
                    €{fmtNumber(communityPriceEur, { maximumFractionDigits: 0 })}
                    <span className="text-sm font-normal text-muted-foreground">
                      {interval === 'month' ? t('billing.plans.perMonth') : t('billing.plans.perYear')}
                    </span>
                  </div>
                  {currentPlanKey !== 'premium_20x' && (
                    <Button onClick={() => handleChoose('premium_20x')} disabled={checkout.isPending} variant="outline" className="w-full">
                      {t('billing.plans.selectPlan')}
                    </Button>
                  )}
                  {currentPlanKey === 'premium_20x' && (
                    <Badge variant="default" className="w-full justify-center">{t('billing.plans.currentPlan')}</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
