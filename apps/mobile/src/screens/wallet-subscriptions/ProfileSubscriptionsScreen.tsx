/**
 * VTID-05425 (Native Wave 2, wallet-subscriptions lane) — native twin of the
 * web `/profile/subscriptions`. On the web `ProfileSubscriptionsRouter`
 * (src/App.tsx) renders the phone-only storefront `MobileSubscriptions`
 * (src/pages/MobileSubscriptions.tsx) when `useIsMobile()` and redirects to
 * `/wallet/subscriptions` on desktop. Native is always the phone context, so
 * this route renders the storefront — today's mobile behaviour; there is no
 * redirect.
 *
 * Storefront order (the web's, not the overview's): back + header, plan state,
 * launch-grant banner, founding banner, redeem card (free), headline plans,
 * larger plans, feature usage, credit packs, earnings, privacy promises, FAQ,
 * then — for members with a subscription — the bottom "Manage" CTA to
 * `/settings?mode=billing` (destructive when past due).
 *
 * iOS IAP: `MobileSubscriptions` carries no `isIAPRestricted()` branch today,
 * so this screen has none either (requirements R3.2). Coming back from a hosted
 * checkout / portal page refreshes billing/me (`useBillingReturnLeg`).
 * React 19: `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, useUITheme } from '../../ports/ui';
import { BillingIcon } from '../../ports/billing';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useBilling, useBillingReturnLeg } from './data/billing';
import { MobileHeader, SubscriptionsError, SubscriptionsLoading, errorMessageOf } from './components/Frame';
import { AddExtraMinutesTile, FoundingBanner, LaunchGrantBanner, PrivacyFirstPromises, WhySubscribeFAQ } from './components/Banners';
import { FeatureComparisonTable, SubscriptionStateCard, YourEarningsWidget } from './components/PlanState';
import { PlansGridExpanded, PlansGridHeadline } from './components/Plans';
import { RedeemCodeCard } from './components/RedeemCodeCard';

export function ProfileSubscriptionsScreen(): ReactElement {
  const { t, rtl } = useI18n();
  const { colors } = useUITheme();
  const { data, isLoading, isError, error } = useBilling();
  useBillingReturnLeg();

  const isFree = data?.plan.plan_key === 'free' || data?.plan.status === 'free';
  const isPastDue = data?.plan.status === 'past_due' || data?.plan.status === 'unpaid';

  // Web: navigate(-1). A cold deep link has no history: fall back to /home (the news reader's rule).
  const back = () => {
    if (router.canGoBack()) router.back();
    else navigateToWebPath('/home', { replace: true });
  };

  return (
    <View testID="profile-subscriptions" style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView testID="profile-subscriptions-scroll" contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable testID="profile-subscriptions-back" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={4} style={styles.back}>
            <View style={rtl ? styles.flip : null}>
              <BillingIcon name="ArrowLeft" size={20} />
            </View>
          </Pressable>
          <View style={styles.fill}>
            <MobileHeader title={t('billing.subscriptionsPage.title')} />
          </View>
        </View>

        {isLoading ? <SubscriptionsLoading testID="profile-subscriptions-loading" /> : null}

        {isError ? <SubscriptionsError testID="profile-subscriptions-error" message={errorMessageOf(error, t('billing.checkoutErrors.checkoutFailed'))} /> : null}

        {data ? (
          <>
            <SubscriptionStateCard data={data} />
            <LaunchGrantBanner data={data} />
            <FoundingBanner />
            {isFree ? <RedeemCodeCard /> : null}
            <PlansGridHeadline currentPlanKey={data.plan.plan_key} />
            <PlansGridExpanded currentPlanKey={data.plan.plan_key} />
            <FeatureComparisonTable data={data} />
            <AddExtraMinutesTile />
            <YourEarningsWidget data={data} />
            <PrivacyFirstPromises />
            <WhySubscribeFAQ />

            {!isFree ? (
              <View style={styles.cta}>
                <Button
                  testID="profile-subscriptions-manage"
                  variant={isPastDue ? 'destructive' : 'outline'}
                  onPress={() => navigateToWebPath('/settings?mode=billing')}
                  style={styles.ctaButton}
                >
                  <BillingIcon name="Settings" size={16} color={isPastDue ? colors.destructiveForeground : colors.foreground} />
                  {t('billing.state.manage')}
                </Button>
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  cta: { paddingTop: 8 },
  ctaButton: { alignSelf: 'stretch', height: 48, borderRadius: 12, gap: 8 },
});
