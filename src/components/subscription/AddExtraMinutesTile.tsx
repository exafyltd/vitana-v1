/**
 * VTID-03107 · "Add extra minutes" tile.
 *
 * Surfaces credit packs as an ACTION, not a tier. Three SKUs labeled by what
 * they buy (per §O — never raw credit counts as the headline).
 *
 * Sibling to PlansGridHeadline + PlansGridExpanded — explicitly NOT inside
 * the plan grid.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useStartCreditsCheckout } from '@/hooks/useBilling';

const PACKS = [
  { packKey: 'starter', labelKey: 'billing.creditPacks.starter', priceKey: 'billing.creditPacks.starterShort', priceEur: '€4.99' },
  { packKey: 'boost', labelKey: 'billing.creditPacks.boost', priceKey: 'billing.creditPacks.boostShort', priceEur: '€19.99' },
  { packKey: 'power', labelKey: 'billing.creditPacks.power', priceKey: 'billing.creditPacks.powerShort', priceEur: '€99' },
] as const;

export function AddExtraMinutesTile() {
  const checkout = useStartCreditsCheckout();

  async function handleBuy(packKey: string) {
    try {
      const result = await checkout.mutateAsync({ packKey });
      if (result.url) window.location.assign(result.url);
    } catch {
      // billingFetch already surfaced
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
          {t('billing.creditPacks.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('billing.creditPacks.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PACKS.map((p) => (
            <Card key={p.packKey} className="border-muted">
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold">{t(p.priceKey)}</div>
                <p className="text-xs text-muted-foreground leading-relaxed min-h-[40px]">{t(p.labelKey)}</p>
                <div className="text-xl font-bold">{p.priceEur}</div>
                <Button
                  onClick={() => handleBuy(p.packKey)}
                  disabled={checkout.isPending}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  {t('billing.creditPacks.buy')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
