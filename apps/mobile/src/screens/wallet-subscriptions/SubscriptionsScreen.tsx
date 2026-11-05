/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — native twin of the
 * web `/wallet/subscriptions` (`src/pages/wallet/Subscriptions.tsx`, the
 * phone branch: the Spotlight frame is desktop + flag only). Wallet sub-nav,
 * mobile header, then — once `/billing/me` answers — the sections in the
 * web's order: privacy promises, launch-grant banner, founding banner, redeem
 * card (free plan only), plan state, earnings, headline plans, larger plans,
 * feature usage, credit packs, FAQ.
 *
 * iOS IAP: the web page and every section it renders carry no
 * `isIAPRestricted()` branch today, so this screen has no platform branch
 * either — no gate added, removed, widened or narrowed (requirements R3.2).
 * Subscriptions are flagged as digital content for the owner's decision-5
 * call (documentation only). The drawer's Wallet-row gate
 * (src/shell/logic/drawer.ts `iapRestricted`) is untouched.
 * Return leg: `?checkout=success|cancelled` (the gateway's Stripe success /
 * cancel URLs) and coming back from a hosted page refresh billing/me
 * (`useBillingReturnLeg`); like the web, the result is the refreshed plan
 * card, with no toast. React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useUITheme } from '../../ports/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { useBilling, useBillingReturnLeg } from './data/billing';
import { MobileHeader, SubscriptionsError, SubscriptionsLoading, WalletSubNav, errorMessageOf } from './components/Frame';
import { AddExtraMinutesTile, FoundingBanner, LaunchGrantBanner, PrivacyFirstPromises, WhySubscribeFAQ } from './components/Banners';
import { FeatureComparisonTable, SubscriptionStateCard, YourEarningsWidget } from './components/PlanState';
import { PlansGridExpanded, PlansGridHeadline } from './components/Plans';
import { RedeemCodeCard } from './components/RedeemCodeCard';

export function SubscriptionsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data, isLoading, isError, error } = useBilling();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  useBillingReturnLeg(checkout);

  return (
    <View testID="wallet-subscriptions" style={[styles.root, { backgroundColor: colors.background }]}>
      <WalletSubNav activeId="subscriptions" />
      <ScrollView testID="wallet-subscriptions-scroll" contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MobileHeader title={t('billing.subscriptionsPage.title')} />

        {isLoading ? <SubscriptionsLoading testID="wallet-subscriptions-loading" /> : null}

        {isError ? <SubscriptionsError testID="wallet-subscriptions-error" message={errorMessageOf(error, t('billing.checkoutErrors.checkoutFailed'))} /> : null}

        {data ? (
          <>
            <PrivacyFirstPromises />
            <LaunchGrantBanner data={data} />
            <FoundingBanner />
            {data.plan.plan_key === 'free' ? <RedeemCodeCard /> : null}
            <SubscriptionStateCard data={data} />
            <YourEarningsWidget data={data} />
            <PlansGridHeadline currentPlanKey={data.plan.plan_key} />
            <PlansGridExpanded currentPlanKey={data.plan.plan_key} />
            <FeatureComparisonTable data={data} />
            <AddExtraMinutesTile />
            <WhySubscribeFAQ />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 24, paddingBottom: 32 },
});
