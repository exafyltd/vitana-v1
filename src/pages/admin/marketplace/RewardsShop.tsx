/**
 * VTID-05036 — Admin › Marketplace › Rewards Shop.
 *
 * Where the owner adds and edits the items members spend earned VTNA on
 * (Wallet › Rewards › Shop, VTID-04983), the flat shipping fees and the
 * orders. Every call goes to the gateway's exafy_admin endpoints
 * (routes/rewards-shop.ts, VTID-04982 + VTID-05035); a tenant admin who is not
 * an exafy admin gets a 403 there, and this page says so instead of showing a
 * form that cannot save. Modeled on PartnerHealthOrders.tsx (route, guard,
 * layout).
 */
import { useState } from 'react';
import { Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import StandardHeader from '@/components/StandardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRTL } from '@/components/RTLProvider';
import { t } from '@/lib/i18n-toast';
import {
  adminRewardKeys,
  isForbidden,
  useAdminRewardItems,
  useAdminShippingFees,
} from '@/hooks/useAdminRewardShop';
import { RewardItemsSection } from '@/components/admin/rewards/RewardItemsSection';
import { ShippingFeesSection } from '@/components/admin/rewards/ShippingFeesSection';
import { RewardOrdersSection } from '@/components/admin/rewards/RewardOrdersSection';
import { ServerError } from '@/components/admin/rewards/ServerError';

const SECTIONS = ['items', 'fees', 'orders'] as const;
type Section = (typeof SECTIONS)[number];

export default function RewardsShop() {
  const isMobile = useIsMobile();
  // Radix Tabs sets dir="ltr" on its root unless told otherwise, which would
  // flip every card inside back to LTR in Arabic.
  const { isRTL } = useRTL();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('items');
  const items = useAdminRewardItems();
  const fees = useAdminShippingFees();

  const forbidden = isForbidden(items.error) || isForbidden(fees.error);
  const loading = items.isLoading || fees.isLoading;

  return (
    <AppLayout>
      <SEO
        title={t('admin.rewardsShop.title')}
        description={t('admin.rewardsShop.description')}
        canonical={typeof window !== 'undefined' ? window.location.href : ''}
      />
      <div className="min-h-screen px-4 py-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <StandardHeader title={t('admin.rewardsShop.title')} description={t('admin.rewardsShop.description')} />

          {forbidden ? (
            <Card data-testid="reward-admin-forbidden">
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <ShieldAlert className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="text-lg font-semibold">{t('admin.rewardsShop.forbiddenTitle')}</p>
                <p className="max-w-md text-sm text-muted-foreground">{t('admin.rewardsShop.forbiddenBody')}</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex items-center gap-2 p-8 text-muted-foreground" data-testid="reward-admin-loading">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('admin.rewardsShop.loading')}
            </div>
          ) : items.error || fees.error ? (
            <div className="space-y-3" data-testid="reward-admin-load-error">
              <ServerError error={items.error ?? fees.error} />
              <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: adminRewardKeys.all })}>
                <RefreshCw className="me-2 h-4 w-4" aria-hidden />
                {t('admin.rewardsShop.retry')}
              </Button>
            </div>
          ) : (
            <Tabs value={section} onValueChange={(v) => setSection(v as Section)} dir={isRTL ? 'rtl' : 'ltr'} data-testid="reward-admin-sections">
              <div className="flex items-end justify-between gap-3">
                {isMobile ? (
                  <div className="min-w-0 flex-1 space-y-1">
                    <label htmlFor="reward-admin-section-select" className="text-xs text-muted-foreground">
                      {t('admin.rewardsShop.sectionLabel')}
                    </label>
                    <select
                      id="reward-admin-section-select"
                      data-testid="reward-admin-section-select"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={section}
                      onChange={(e) => setSection(e.target.value as Section)}
                    >
                      {SECTIONS.map((s) => <option key={s} value={s}>{t(`admin.rewardsShop.sections.${s}`)}</option>)}
                    </select>
                  </div>
                ) : (
                  <TabsList>
                    {SECTIONS.map((s) => (
                      <TabsTrigger key={s} value={s} data-testid={`reward-admin-tab-${s}`}>{t(`admin.rewardsShop.sections.${s}`)}</TabsTrigger>
                    ))}
                  </TabsList>
                )}
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 shrink-0"
                  aria-label={t('admin.rewardsShop.refresh')}
                  onClick={() => qc.invalidateQueries({ queryKey: adminRewardKeys.all })}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              <TabsContent value="items" className="mt-4">
                <RewardItemsSection items={items.data ?? []} />
              </TabsContent>
              <TabsContent value="fees" className="mt-4">
                <ShippingFeesSection fees={fees.data ?? []} items={items.data ?? []} />
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <RewardOrdersSection items={items.data ?? []} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
