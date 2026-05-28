/**
 * VTID-03107 · Settings → Billing.
 *
 * Replaces the 577-line mock with a clean live page wired to /billing/me.
 * Plan management itself lives on /wallet/subscriptions (the Subscriptions
 * screen rewritten in PR-3); this page covers the secondary surfaces:
 *   - Current plan summary (real, from useBilling)
 *   - Stripe Billing Portal redirect (manage / cancel / update card)
 *   - Pointer to /wallet/subscriptions for plan changes
 *   - Creator payouts section (already real via VTID-01230 Stripe Connect)
 *
 * Invoice history is intentionally NOT reimplemented here — the Stripe
 * Billing Portal owns that surface (PCI-compliant, hosted by Stripe, has
 * download buttons built in). We just link to it.
 */

import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import StandardHeader from '@/components/StandardHeader';
import { settingsNavigation } from '@/config/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreatorPaymentsSection } from '@/components/creator/CreatorPaymentsSection';
import { CreditCard, ExternalLink, Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n-toast';
import { useBilling, useOpenPortal } from '@/hooks/useBilling';
import { SubscriptionStateCard } from '@/components/subscription/SubscriptionStateCard';

function BillingLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useBilling();
  const portal = useOpenPortal();

  async function handleOpenPortal() {
    try {
      const result = await portal.mutateAsync();
      if (result?.url) window.location.assign(result.url);
    } catch {
      // billingFetch surfaces the error toast itself
    }
  }

  return (
    <AppLayout>
      <SEO
        title={t('screens.settings.billingSettings')}
        description={t('billing.subscriptionsPage.subtitle')}
        canonical={window.location.href}
      />
      <SubNavigation items={settingsNavigation} />

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <StandardHeader
          title={t('screens.settings.billing')}
          description={t('billing.subscriptionsPage.subtitle')}
        />

        {isLoading && <BillingLoading />}

        {isError && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : t('billing.checkoutErrors.checkoutFailed')}
              </p>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {/* Live current-plan card — same component the Subscriptions screen uses */}
            <SubscriptionStateCard data={data} />

            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" aria-hidden="true" />
                  {t('billing.state.manage')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/wallet/subscriptions')}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {t('billing.state.viewPlans')}
                  </span>
                  <span aria-hidden="true">→</span>
                </Button>

                {data.stripe.has_customer && (
                  <Button
                    variant="outline"
                    onClick={handleOpenPortal}
                    disabled={portal.isPending}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      {t('billing.state.manage')}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Creator payouts (Stripe Connect — VTID-01230, already wired) */}
            <CreatorPaymentsSection />
          </>
        )}
      </div>
    </AppLayout>
  );
}
