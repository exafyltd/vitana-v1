/**
 * VTID-03107 · /wallet/subscriptions — real billing-backed Subscriptions screen.
 *
 * Rewritten from 217 lines of mock USD data → live `useBilling()` rendering
 * with the privacy promises, redeem code card, current plan state, plan
 * comparison (Free + Premium headline; Host + Community disclosure), feature
 * usage table, credit-pack tile, and FAQ.
 *
 * Mobile-first; responsive grid. Preserves the existing AppLayout +
 * SubNavigation + StandardHeader shell.
 */

import { Suspense } from 'react';
import SEO from '@/components/SEO';
import AppLayout from '@/components/AppLayout';
import SubNavigation from '@/components/SubNavigation';
import StandardHeader from '@/components/StandardHeader';
import { walletNavigation } from '@/config/navigation';
import { SCREEN_IDS, withScreenId } from '@/lib/screen-id';
import { Panel as Card, PanelContent as CardContent } from '@/components/layout/spotlight/Panel';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n-toast';
import { useBilling } from '@/hooks/useBilling';
import { PrivacyFirstPromises } from '@/components/subscription/PrivacyFirstPromises';
import { SubscriptionStateCard } from '@/components/subscription/SubscriptionStateCard';
import { PlansGridHeadline } from '@/components/subscription/PlansGridHeadline';
import { PlansGridExpanded } from '@/components/subscription/PlansGridExpanded';
import { FeatureComparisonTable } from '@/components/subscription/FeatureComparisonTable';
import { AddExtraMinutesTile } from '@/components/subscription/AddExtraMinutesTile';
import { RedeemCodeCard } from '@/components/subscription/RedeemCodeCard';
import { YourEarningsWidget } from '@/components/subscription/YourEarningsWidget';
import { WhySubscribeFAQ } from '@/components/subscription/WhySubscribeFAQ';
import { FoundingBanner } from '@/components/subscription/FoundingBanner';
import { LaunchGrantBanner } from '@/components/subscription/LaunchGrantBanner';
import { AlertCircle } from 'lucide-react';
import { ArchetypeSkeleton, ScreenFrame } from '@/components/layout/spotlight';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { TierBEmpty } from '@/components/spotlight/tier-b/TierBKit';

function SubscriptionsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function SubscriptionsError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-2">
        <p className="text-sm text-destructive">{message}</p>
      </CardContent>
    </Card>
  );
}

function Subscriptions() {
  const { data, isLoading, isError, error } = useBilling();
  // VTID-05111 — Spotlight Tier B (desktop + flag only; phones and flag-off keep the screen below).
  const spotlight = useSpotlightEnabled();

  if (spotlight) {
    return (
      <AppLayout>
        <SEO title={t('billing.subscriptionsPage.title')} description={t('billing.subscriptionsPage.subtitle')} />
        <ScreenFrame
          archetype="collection"
          subNav={{ items: walletNavigation }}
          header={{ title: t('billing.subscriptionsPage.title'), description: t('billing.subscriptionsPage.subtitle'), emoji: '⭐' }}
        >
          {isLoading && <ArchetypeSkeleton archetype="collection" />}
          {isError && (
            <TierBEmpty Icon={AlertCircle} titleKey="spotlightTierB.common.errorTitle" descriptionKey="billing.checkoutErrors.checkoutFailed" />
          )}
          {data && (
            <div className="flex flex-col gap-6">
              <PrivacyFirstPromises />
              <LaunchGrantBanner data={data} />
              <FoundingBanner />
              {data.plan.plan_key === 'free' && <RedeemCodeCard />}
              <SubscriptionStateCard data={data} />
              <YourEarningsWidget data={data} />
              <PlansGridHeadline currentPlanKey={data.plan.plan_key} />
              <PlansGridExpanded currentPlanKey={data.plan.plan_key} />
              <FeatureComparisonTable data={data} />
              <AddExtraMinutesTile />
              <WhySubscribeFAQ />
            </div>
          )}
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO
        title={t('billing.subscriptionsPage.title')}
        description={t('billing.subscriptionsPage.subtitle')}
      />
      <SubNavigation items={walletNavigation} />

      <div className="bg-gradient-to-br from-category-2/5 via-category-3/5 to-category-4/5 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
          <StandardHeader
            title={t('billing.subscriptionsPage.title')}
            description={t('billing.subscriptionsPage.subtitle')}
          />

          {isLoading && <SubscriptionsLoading />}

          {isError && (
            <SubscriptionsError message={error instanceof Error ? error.message : t('billing.checkoutErrors.checkoutFailed')} />
          )}

          {data && (
            <>
              {/* Privacy + trust promises (anchor at top) */}
              <PrivacyFirstPromises />

              {/* Launch auto-grant welcome (one-time, for users granted 12mo Premium at launch) */}
              <LaunchGrantBanner data={data} />

              {/* Founding Member launch banner — auto-hides once campaign exhausted or user is paid */}
              <FoundingBanner />

              {/* Redeem code (above the plan grid for free users) */}
              {data.plan.plan_key === 'free' && <RedeemCodeCard />}

              {/* Current subscription state hero */}
              <SubscriptionStateCard data={data} />

              {/* Earnings widget — renders only with non-zero history */}
              <YourEarningsWidget data={data} />

              {/* Headline plan grid (Free + Premium) */}
              <PlansGridHeadline currentPlanKey={data.plan.plan_key} />

              {/* Disclosure: Host + Community */}
              <PlansGridExpanded currentPlanKey={data.plan.plan_key} />

              {/* Feature comparison table with progress bars */}
              <FeatureComparisonTable data={data} />

              {/* Credit packs ("Add extra minutes" — outside the plan grid) */}
              <AddExtraMinutesTile />

              {/* Why Premium FAQ */}
              <WhySubscribeFAQ />
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Subscriptions, SCREEN_IDS.WALLET_SUBSCRIPTIONS);
