/**
 * VTID-05431 (Native Wave 2, settings lane) — `/settings?mode=billing[.plan|
 * .payment|.invoices|.creator]`, the native twin of
 * `src/components/settings/MobileBillingView.tsx` with its
 * `SubscriptionStateCard.tsx` and `CreatorPaymentsSection.tsx` /
 * `EnablePaymentsButton.tsx`. Reads `GET /billing/me` and `GET
 * /creators/status`; the Stripe portal (`POST /billing/portal`), Connect
 * onboarding (`POST /creators/onboard`) and dashboard links open in the system
 * browser (the web's `window.location.assign` / `window.open`).
 *
 * iOS in-app-purchase gates: kept exactly as today. The web shows this
 * section on every platform with no `isIAPRestricted()` check (that gate
 * hides only the wallet entry points, `drawer.ts` `iapRestricted` on native),
 * so this port adds none and removes none.
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, PressableRow, Skeleton, Text, useUITheme } from '../../../ports/ui';
import { SettingsIcon, type SettingsGlyph } from '../../../ports/settings-ui';
import { webConsoleUrl } from '../../../identity/web-console';
import { appLink } from '../../../ports/links';
import { navigateToWebPath } from '../../../navigation/navigate';
import { useI18n } from '../../../i18n/I18nProvider';
import { SectionCard } from '../components';
import { useBilling, useCreatorDashboard, useCreatorOnboard, useCreatorStatus, useOpenPortal, type BillingMe } from '../data/hooks';
import type { BillingSection as Section } from '../sections';
import { formatDate } from '../format';

/** Storefront on the phone (MobileBillingView `plansHref`, isMobile branch). */
const PLANS_HREF = '/profile/subscriptions';

function RowLink({ icon, label, onPress, testID }: { icon: SettingsGlyph; label: string; onPress: () => void; testID: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <PressableRow onPress={onPress} accessibilityLabel={label} testID={testID} style={styles.rowLink}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <SettingsIcon name={icon} size={16} color={colors.primary} />
      </View>
      <Text size="sm" weight="500" style={styles.fill}>
        {label}
      </Text>
      <SettingsIcon name="ChevronRight" size={16} color={colors.mutedForeground} />
    </PressableRow>
  );
}

function ActionButton({ icon, label, onPress, disabled, testID, variant = 'outline' }: { icon: SettingsGlyph; label: string; onPress: () => void; disabled?: boolean; testID: string; variant?: 'outline' | 'default' | 'destructive' }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Button variant={variant} onPress={onPress} disabled={disabled} testID={testID} style={styles.actionButton}>
      <View style={styles.actionInner}>
        <View style={styles.actionLabel}>
          <SettingsIcon name={icon} size={16} color={variant === 'outline' ? colors.foreground : colors.primaryForeground} />
          <Text size="sm" weight="500" color={variant === 'outline' ? colors.foreground : colors.primaryForeground}>
            {label}
          </Text>
        </View>
        {variant === 'outline' ? <SettingsIcon name="ChevronRight" size={16} /> : null}
      </View>
    </Button>
  );
}

export function BillingSectionView({ section, onNavigateChild }: { section: Section; onNavigateChild: (s: Section) => void }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data, isLoading, isError } = useBilling();
  const portal = useOpenPortal();

  if (isLoading) {
    return (
      <View style={styles.loading} testID="billing-loading">
        <Skeleton style={styles.skeletonTall} />
        <Skeleton style={styles.skeletonShort} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <SectionCard testID="billing-error">
        <Text size="sm" color={colors.destructive}>
          {t('billing.checkoutErrors.checkoutFailed')}
        </Text>
      </SectionCard>
    );
  }

  const hasCustomer = data.stripe.has_customer;
  const toPlans = () => navigateToWebPath(PLANS_HREF);

  if (section === 'billing') {
    return (
      <>
        <SubscriptionStateCard data={data} />
        <SectionCard testID="billing-overview" style={styles.tightCard}>
          <RowLink icon="Sparkles" label={t('billing.mobileBilling.navPlan')} onPress={() => onNavigateChild('billing.plan')} testID="billing-nav-plan" />
          <RowLink icon="CreditCard" label={t('billing.mobileBilling.navPayment')} onPress={() => onNavigateChild('billing.payment')} testID="billing-nav-payment" />
          <RowLink icon="Receipt" label={t('billing.mobileBilling.navInvoices')} onPress={() => onNavigateChild('billing.invoices')} testID="billing-nav-invoices" />
          <RowLink icon="DollarSign" label={t('billing.mobileBilling.navCreator')} onPress={() => onNavigateChild('billing.creator')} testID="billing-nav-creator" />
        </SectionCard>
      </>
    );
  }

  if (section === 'billing.plan') {
    return (
      <>
        <SubscriptionStateCard data={data} />
        <SectionCard testID="billing-plan">
          <ActionButton icon="Sparkles" label={t('billing.mobileBilling.changePlan')} onPress={toPlans} testID="billing-change-plan" />
          {hasCustomer ? <ActionButton icon="ExternalLink" label={t('billing.state.manage')} onPress={() => void portal.open()} disabled={portal.isPending} testID="billing-plan-portal" /> : null}
        </SectionCard>
      </>
    );
  }

  if (section === 'billing.payment') {
    return (
      <SectionCard icon="CreditCard" title={t('billing.mobileBilling.paymentTitle')} testID="billing-payment">
        <Text size="sm" muted>
          {hasCustomer ? t('billing.mobileBilling.paymentBody') : t('billing.mobileBilling.paymentNoneBody')}
        </Text>
        {hasCustomer ? (
          <ActionButton icon="ExternalLink" label={t('billing.mobileBilling.openStripe')} onPress={() => void portal.open()} disabled={portal.isPending} testID="billing-payment-portal" />
        ) : (
          <ActionButton icon="Sparkles" label={t('billing.state.viewPlans')} onPress={toPlans} testID="billing-payment-plans" />
        )}
      </SectionCard>
    );
  }

  if (section === 'billing.invoices') {
    return (
      <SectionCard icon="Receipt" title={t('billing.mobileBilling.invoicesTitle')} testID="billing-invoices">
        <Text size="sm" muted>
          {t('billing.mobileBilling.invoicesBody')}
        </Text>
        {hasCustomer ? <ActionButton icon="ExternalLink" label={t('billing.mobileBilling.openStripe')} onPress={() => void portal.open()} disabled={portal.isPending} testID="billing-invoices-portal" /> : null}
      </SectionCard>
    );
  }

  if (section === 'billing.creator') return <CreatorPaymentsCard />;
  return null;
}

/** `src/components/subscription/SubscriptionStateCard.tsx` — free / past due / active-or-trialing. */
function SubscriptionStateCard({ data }: { data: BillingMe }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const portal = useOpenPortal();
  const plan = data.plan;
  const isFree = plan.plan_key === 'free' || plan.status === 'free';
  const isPastDue = plan.status === 'past_due' || plan.status === 'unpaid';
  const isTrialing = plan.status === 'trialing';
  const isCanceled = plan.status === 'canceled';

  if (isFree) {
    return (
      <SectionCard testID="subscription-free">
        <View style={styles.cardTitle}>
          <Text weight="600">{t('billing.state.freeStatus')}</Text>
          <Badge variant="secondary">{t('billing.plans.free.name')}</Badge>
        </View>
        <Text size="sm" muted>
          {t('billing.state.freeBody')}
        </Text>
        <ActionButton variant="default" icon="Sparkles" label={t('billing.state.viewPlans')} onPress={() => navigateToWebPath('/wallet/subscriptions')} testID="subscription-view-plans" />
      </SectionCard>
    );
  }
  if (isPastDue) {
    return (
      <SectionCard testID="subscription-past-due" style={{ borderColor: colors.destructive }}>
        <View style={styles.cardTitle}>
          <Text weight="600">{t('billing.state.pastDue')}</Text>
          <Badge variant="destructive">{plan.status}</Badge>
        </View>
        <Text size="sm" muted>
          {t('billing.state.pastDueBody')}
        </Text>
        <ActionButton variant="destructive" icon="CreditCard" label={t('billing.state.manage')} onPress={() => void portal.open()} disabled={portal.isPending} testID="subscription-manage" />
      </SectionCard>
    );
  }
  const isAutoGrant = plan.source === 'launch_auto_grant_2026';
  return (
    <SectionCard testID="subscription-active" style={{ borderColor: colors.primary }}>
      <View style={styles.cardTitle}>
        <Text weight="600">{t('billing.state.premiumActive')}</Text>
        <Badge variant="default">{isTrialing ? t('billing.state.trialingBadge') : t('billing.state.activeBadge')}</Badge>
      </View>
      {isTrialing && plan.trial_end ? (
        <Text size="sm" muted>
          {t('billing.state.trialEndsAt', { date: formatDate(plan.trial_end, locale) })}
        </Text>
      ) : null}
      {!isTrialing && plan.current_period_end ? (
        <Text size="sm" muted testID="subscription-period">
          {isAutoGrant
            ? t('billing.state.autoGrantUntil', { date: formatDate(plan.current_period_end, locale) })
            : plan.cancel_at_period_end
              ? t('billing.state.cancelAtPeriodEnd')
              : t('billing.state.renewsAt', { date: formatDate(plan.current_period_end, locale) })}
        </Text>
      ) : null}
      <ActionButton icon="CreditCard" label={t('billing.state.manage')} onPress={() => void portal.open()} disabled={portal.isPending || isCanceled} testID="subscription-manage" />
    </SectionCard>
  );
}

/** Stripe Connect return/refresh pages (web `window.location.origin` + path): the web host when configured, else the app link. */
const creatorUrl = (path: string) => webConsoleUrl(path) ?? appLink(path);

/** `src/components/creator/CreatorPaymentsSection.tsx` + `EnablePaymentsButton.tsx`. */
function CreatorPaymentsCard(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { data: status, isLoading } = useCreatorStatus();
  const onboard = useCreatorOnboard(() => ({ returnUrl: creatorUrl('/creator/onboarded'), refreshUrl: creatorUrl('/creator/onboard') }));
  const dashboard = useCreatorDashboard();

  if (isLoading) {
    return (
      <SectionCard icon="DollarSign" title={t('screens.creator.creatorPayments')} testID="creator-loading">
        <View style={styles.inline}>
          <SettingsIcon name="Clock" size={16} color={colors.mutedForeground} />
          <Text muted>{t('screens.creator.loadingPaymentStatus')}</Text>
        </View>
      </SectionCard>
    );
  }

  const isFullyOnboarded = !!status?.charges_enabled && !!status?.payouts_enabled;
  const isPartiallyOnboarded = !!status?.stripe_account_id && !isFullyOnboarded;
  const notOnboarded = !status?.stripe_account_id;

  const notice = (tone: 'success' | 'warning' | 'info', title: string, body: string, testID: string) => {
    const fg = tone === 'success' ? colors.statusSuccess : tone === 'warning' ? colors.statusWarning : colors.statusInfo;
    const bg = tone === 'success' ? colors.statusSuccessSubtle : tone === 'warning' ? colors.statusWarningSubtle : colors.statusInfoSubtle;
    return (
      <View style={[styles.notice, { backgroundColor: bg, borderColor: fg }]} testID={testID}>
        <Text weight="500" color={fg}>
          {title}
        </Text>
        <Text size="sm" color={fg}>
          {body}
        </Text>
      </View>
    );
  };

  return (
    <SectionCard icon="DollarSign" title={t('screens.creator.creatorPayments')} testID="creator-payments">
      <View style={styles.statusRow}>
        <View style={styles.fill}>
          <Text weight="500">{t('screens.creator.paymentStatus')}</Text>
          <Text size="sm" muted>
            {t('screens.creator.receive90RevenueFromPaidLive')}
          </Text>
        </View>
        {isFullyOnboarded ? <Badge variant="success">{t('screens.creator.active')}</Badge> : null}
        {isPartiallyOnboarded ? <Badge variant="secondary">{t('screens.creator.setupIncomplete')}</Badge> : null}
        {notOnboarded ? <Badge variant="outline">{t('screens.creator.notEnabled')}</Badge> : null}
      </View>

      {isFullyOnboarded ? (
        <>
          {notice('success', t('screens.creator.paymentsEnabled'), t('screens.creator.youCanNowCreatePaidLive'), 'creator-enabled')}
          <View style={styles.split}>
            <View style={[styles.splitCell, { backgroundColor: colors.muted }]}>
              <Text size="sm" muted>
                {t('screens.creator.yourShare')}
              </Text>
              <Text size="2xl" weight="700" color={colors.statusSuccess}>
                {t('settingsNative.creator.creatorShare')}
              </Text>
              <Text size="xs" muted>
                {t('screens.creator.roomPrice')}
              </Text>
            </View>
            <View style={[styles.splitCell, { backgroundColor: colors.muted }]}>
              <Text size="sm" muted>
                {t('screens.creator.platformFee')}
              </Text>
              <Text size="2xl" weight="700" muted>
                {t('settingsNative.creator.platformShare')}
              </Text>
              <Text size="xs" muted>
                {t('screens.creator.serviceFee')}
              </Text>
            </View>
          </View>
        </>
      ) : null}
      {isPartiallyOnboarded ? notice('warning', t('screens.creator.setupIncomplete'), t('screens.creator.completeYourPaymentSetupStartReceiving'), 'creator-incomplete') : null}
      {notOnboarded ? notice('info', t('screens.creator.earnFromYourLiveRooms'), t('screens.creator.enablePaymentsCreatePaidLiveRooms'), 'creator-not-onboarded') : null}

      <View style={styles.actionsRow}>
        {isFullyOnboarded ? (
          <View style={styles.inline}>
            <SettingsIcon name="CheckCircle2" size={16} color={colors.statusSuccess} />
            <Text size="sm" weight="500" color={colors.statusSuccess}>
              {t('screens.creator.paymentsEnabled')}
            </Text>
          </View>
        ) : (
          <Button variant={isPartiallyOnboarded ? 'outline' : 'default'} disabled={onboard.isPending} onPress={() => onboard.mutate()} testID="creator-onboard">
            {onboard.isPending ? t('settingsNative.creator.redirecting') : isPartiallyOnboarded ? t('settingsNative.creator.completeSetup') : t('settingsNative.creator.enablePayments')}
          </Button>
        )}
        {isFullyOnboarded ? (
          <Button variant="outline" disabled={dashboard.isPending} onPress={() => dashboard.mutate()} testID="creator-dashboard">
            {dashboard.isPending ? t('settingsNative.creator.opening') : t('settingsNative.creator.viewDashboard')}
          </Button>
        ) : null}
      </View>

      {!notOnboarded ? (
        <View style={styles.examples} testID="creator-examples">
          <Text size="sm" weight="500">
            {t('screens.creator.revenueExamples')}
          </Text>
          {[
            { price: 9.99, creator: 8.99, platform: 1.0 },
            { price: 19.99, creator: 17.99, platform: 2.0 },
            { price: 49.99, creator: 44.99, platform: 5.0 },
          ].map(({ price, creator, platform }) => (
            <View key={price} style={[styles.example, { backgroundColor: colors.muted }]}>
              <Text size="sm" muted>
                {t('screens.creator.roomPricePrice', { price })}
              </Text>
              <View style={styles.inline}>
                <Text size="sm" weight="500" color={colors.statusSuccess}>
                  {t('screens.creator.youCreator', { creator })}
                </Text>
                <Text size="sm" muted>
                  {t('screens.creator.feePlatform', { platform })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 12 },
  skeletonTall: { height: 128, borderRadius: 16 },
  skeletonShort: { height: 96, borderRadius: 16 },
  tightCard: { padding: 8, gap: 0 },
  rowLink: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  actionButton: { width: '100%' },
  actionInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  notice: { borderWidth: 1, borderRadius: 8, padding: 16, gap: 4 },
  split: { flexDirection: 'row', gap: 16 },
  splitCell: { flex: 1, padding: 12, borderRadius: 8 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  examples: { gap: 8, paddingTop: 16 },
  example: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 4 },
});
