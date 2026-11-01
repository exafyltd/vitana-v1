/**
 * VTID-05425 — native twins of the web plan-state widgets:
 *  - `SubscriptionStateCard` (src/components/subscription/SubscriptionStateCard.tsx):
 *    free / past-due / active-or-trialing hero, "View plans" or "Manage"
 *    (`BillingActions.openPortal`, ../data/actions.ts — POST /billing/portal);
 *  - `YourEarningsWidget` (YourEarningsWidget.tsx): hidden with no earnings
 *    and no cash balance; "Withdraw" opens the portal when cash > 0;
 *  - `FeatureComparisonTable` (FeatureComparisonTable.tsx): the six metered
 *    features with used / quota and a progress bar when quota > 0.
 * No `isIAPRestricted` branch on the web, none here (requirements R3.2).
 */
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Text, useUITheme } from '../../../ports/ui';
import { BillingIcon, Progress } from '../../../ports/billing';
import { useI18n } from '../../../i18n/I18nProvider';
import { navigateToWebPath } from '../../../navigation/navigate';
import { fmtDate, fmtNumber } from '../format';
import { openBillingUrl, useOpenPortal, type BillingMe } from '../data/billing';

export function SubscriptionStateCard({ data }: { data: BillingMe }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const openPortal = useOpenPortal();
  const plan = data.plan;
  const isFree = plan.plan_key === 'free' || plan.status === 'free';
  const isPastDue = plan.status === 'past_due' || plan.status === 'unpaid';
  const isTrialing = plan.status === 'trialing';
  const isCanceled = plan.status === 'canceled';

  const handleManage = async () => {
    try {
      const result = await openPortal.mutateAsync();
      openBillingUrl(result?.url);
    } catch {
      // web: billingFetch already surfaced the error
    }
  };

  if (isFree) {
    return (
      <Card testID="subs-state-free">
        <CardHeader>
          <View style={styles.titleRow}>
            <CardTitle size="lg" style={styles.fill}>
              {t('billing.state.freeStatus')}
            </CardTitle>
            <Badge variant="secondary">{t('billing.plans.free.name')}</Badge>
          </View>
        </CardHeader>
        <CardContent style={styles.body}>
          <Text size="sm" muted>
            {t('billing.state.freeBody')}
          </Text>
          <Button testID="subs-state-view-plans" onPress={() => navigateToWebPath('/wallet/subscriptions')} style={styles.fullWidth}>
            <BillingIcon name="Sparkles" size={16} color={colors.primaryForeground} />
            {t('billing.state.viewPlans')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isPastDue) {
    return (
      <Card testID="subs-state-past-due" style={{ borderColor: colors.destructive }}>
        <CardHeader>
          <View style={styles.titleRow}>
            <CardTitle size="lg" style={styles.fill}>
              {t('billing.state.pastDue')}
            </CardTitle>
            <Badge variant="destructive">
              <View style={styles.titleRow}>
                <BillingIcon name="AlertCircle" size={12} color={colors.destructiveForeground} />
                <Text size="xs" weight="600" color={colors.destructiveForeground}>
                  {plan.status}
                </Text>
              </View>
            </Badge>
          </View>
        </CardHeader>
        <CardContent style={styles.body}>
          <Text size="sm" muted>
            {t('billing.state.pastDueBody')}
          </Text>
          <Button testID="subs-state-manage" variant="destructive" onPress={handleManage} disabled={openPortal.isPending} style={styles.fullWidth}>
            <BillingIcon name="CreditCard" size={16} color={colors.destructiveForeground} />
            {t('billing.state.manage')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isAutoGrant = plan.source === 'launch_auto_grant_2026';
  let periodLine: string | null = null;
  if (isTrialing && plan.trial_end) {
    periodLine = t('billing.state.trialEndsAt', { date: fmtDate(language, plan.trial_end) });
  } else if (!isTrialing && plan.current_period_end) {
    periodLine = isAutoGrant
      ? t('billing.state.autoGrantUntil', { date: fmtDate(language, plan.current_period_end) })
      : plan.cancel_at_period_end
        ? t('billing.state.cancelAtPeriodEnd')
        : t('billing.state.renewsAt', { date: fmtDate(language, plan.current_period_end) });
  }

  return (
    <Card testID="subs-state-active" style={{ borderColor: colors.primary }}>
      <CardHeader>
        <View style={styles.titleRow}>
          <CardTitle size="lg" style={styles.fill}>
            {t('billing.state.premiumActive')}
          </CardTitle>
          <Badge variant="default" testID="subs-state-badge">
            <View style={styles.titleRow}>
              <BillingIcon name="Check" size={12} color={colors.primaryForeground} />
              <Text size="xs" weight="600" color={colors.primaryForeground}>
                {isTrialing ? t('billing.state.trialingBadge') : t('billing.state.activeBadge')}
              </Text>
            </View>
          </Badge>
        </View>
      </CardHeader>
      <CardContent style={styles.body}>
        {periodLine ? (
          <Text size="sm" muted testID="subs-state-period">
            {periodLine}
          </Text>
        ) : null}
        <Button testID="subs-state-manage" variant="outline" onPress={handleManage} disabled={openPortal.isPending || isCanceled} style={styles.fullWidth}>
          <BillingIcon name="CreditCard" size={16} />
          {t('billing.state.manage')}
        </Button>
      </CardContent>
    </Card>
  );
}

export function YourEarningsWidget({ data }: { data: BillingMe }): ReactElement | null {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  // The web calls useOpenPortal after its early return (a hook-order bug); native calls it first.
  const portal = useOpenPortal();
  const earnedCents = data.earnings.year_in_cents;
  const cashBalanceCents = data.wallet.cash_balance;

  if (earnedCents === 0 && cashBalanceCents === 0) return null;

  const handleWithdraw = async () => {
    try {
      const result = await portal.mutateAsync();
      openBillingUrl(result?.url);
    } catch {
      // web: billingFetch already surfaced
    }
  };

  const money = (cents: number) => `€${fmtNumber(language, cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const cashEur = cashBalanceCents / 100;

  return (
    <Card testID="subs-earnings" style={{ borderColor: colors.primary }}>
      <CardContent style={[styles.body, styles.padded]}>
        <Text size="sm" weight="600" accessibilityRole="header">
          {t('billing.earnings.title')}
        </Text>
        <View style={styles.row}>
          <Text size="sm" muted style={styles.fill}>
            {t('billing.earnings.youEarned')}
          </Text>
          <Text size="sm" testID="subs-earnings-earned">
            {money(earnedCents)}
          </Text>
        </View>
        <View style={[styles.row, styles.netRow, { borderTopColor: colors.border }]}>
          <Text size="sm" weight="500" style={styles.fill}>
            {t('billing.earnings.net')}
          </Text>
          <Text size="sm" weight="700" testID="subs-earnings-net">
            {money(cashBalanceCents)}
          </Text>
        </View>
        {cashEur > 0 ? (
          <Button testID="subs-earnings-withdraw" variant="outline" size="sm" onPress={handleWithdraw} disabled={portal.isPending} style={styles.fullWidth}>
            {t('billing.earnings.withdraw')}
            <BillingIcon name="ArrowUpRight" size={16} />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

const FEATURES: ReadonlyArray<{ key: string; labelKey: string; unitKey: string }> = [
  { key: 'voice_live_minutes', labelKey: 'billing.features.voiceLive', unitKey: 'billing.features.voiceLiveUnit' },
  { key: 'live_room_minutes', labelKey: 'billing.features.liveRooms', unitKey: 'billing.features.liveRoomsUnit' },
  { key: 'match_posts', labelKey: 'billing.features.matchPosts', unitKey: 'billing.features.matchPostsUnit' },
  { key: 'match_reveals', labelKey: 'billing.features.matchReveals', unitKey: 'billing.features.matchRevealsUnit' },
  { key: 'lab_analyses', labelKey: 'billing.features.labAnalyses', unitKey: 'billing.features.labAnalysesUnit' },
  { key: 'photo_uploads', labelKey: 'billing.features.photoUploads', unitKey: 'billing.features.photoUploadsUnit' },
];

export function FeatureComparisonTable({ data }: { data: BillingMe }): ReactElement {
  const { t } = useI18n();
  return (
    <Card testID="subs-features">
      <CardHeader>
        <CardTitle size="base">{t('billing.features.comparisonTitle')}</CardTitle>
      </CardHeader>
      <CardContent style={styles.body}>
        {FEATURES.map((feat) => {
          const u = data.usage[feat.key];
          const used = u?.used ?? 0;
          const quota = u?.quota ?? 0;
          const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
          const usedLabel = t('billing.features.used', { used, limit: quota, unit: t(feat.unitKey) });
          return (
            <View key={feat.key} style={styles.feature} testID={`subs-feature-${feat.key}`}>
              <View style={styles.row}>
                <Text size="sm" weight="500" style={styles.fill}>
                  {t(feat.labelKey)}
                </Text>
                <Badge variant={pct >= 100 ? 'destructive' : pct >= 80 ? 'outline' : 'secondary'} testID={`subs-feature-${feat.key}-count`}>
                  {`${used} / ${quota}`}
                </Badge>
              </View>
              {quota > 0 ? <Progress value={pct} style={styles.progress} accessibilityLabel={usedLabel} testID={`subs-feature-${feat.key}-progress`} /> : null}
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fill: { flex: 1 },
  body: { gap: 12 },
  padded: { paddingTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  netRow: { borderTopWidth: 1, paddingTop: 4, marginTop: 4 },
  feature: { gap: 6 },
  progress: { height: 6 },
  fullWidth: { alignSelf: 'stretch', gap: 8 },
});
