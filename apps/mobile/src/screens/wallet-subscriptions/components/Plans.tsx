/**
 * VTID-05425 — native twins of the web plan grids:
 *  - `PlansGridHeadline` (src/components/subscription/PlansGridHeadline.tsx):
 *    Free + Premium cards, month/year switch, Premium "Choose" CTA;
 *  - `PlansGridExpanded` (PlansGridExpanded.tsx): the Host + Community
 *    disclosure, collapsed unless the member is on one of them.
 * Same prices (cents), same price keys, same current-plan badges. Choosing a
 * plan hands the price key to `BillingActions.startSubscriptionCheckout`
 * (../data/actions.ts; POST /billing/checkout/subscription) and opens the returned hosted
 * URL, as the web does. Neither web component reads
 * `isIAPRestricted`, so there is no platform branch here (requirements R3.2).
 */
import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Text, useUITheme } from '../../../ports/ui';
import { BillingIcon } from '../../../ports/billing';
import { useI18n } from '../../../i18n/I18nProvider';
import { fmtNumber } from '../format';
import { useOpenBillingUrl, useStartSubscriptionCheckout } from '../data/billing';
import { IntervalToggle, type Interval } from './IntervalToggle';

const PREMIUM_PRICE_CENTS: Record<Interval, number> = { month: 999, year: 8900 };
const HOST_MONTHLY = 9900;
const HOST_ANNUAL = 89000;
const COMMUNITY_MONTHLY = 19900;
const COMMUNITY_ANNUAL = 199000;

function FeatureLine({ children }: { children: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.featureLine}>
      <BillingIcon name="Check" size={16} color={colors.primary} />
      <Text size="sm" style={styles.fill}>
        {children}
      </Text>
    </View>
  );
}

function PriceLine({ amount, interval, big }: { amount: string; interval: Interval; big?: boolean }): ReactElement {
  const { t } = useI18n();
  return (
    <Text size="2xl" weight="700" style={big ? styles.bigPrice : null}>
      {amount}
      <Text size="sm" muted>
        {interval === 'month' ? t('billing.plans.perMonth') : t('billing.plans.perYear')}
      </Text>
    </Text>
  );
}

export function PlansGridHeadline({ currentPlanKey, hideCta }: { currentPlanKey: string; hideCta?: boolean }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [interval, setInterval] = useState<Interval>('month');
  const checkout = useStartSubscriptionCheckout();
  const openBillingUrl = useOpenBillingUrl();
  const isFreeCurrent = currentPlanKey === 'free';

  const handleChoosePremium = async () => {
    try {
      const priceKey = interval === 'month' ? 'premium_monthly' : 'premium_annual';
      const result = await checkout.mutateAsync({ priceKey });
      openBillingUrl(result?.url);
    } catch {
      // web: billingFetch already surfaced the error
    }
  };

  const priceEur = PREMIUM_PRICE_CENTS[interval] / 100;

  return (
    <View testID="subs-plans-headline" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text size="lg" weight="600" accessibilityRole="header" style={styles.fill}>
          {t('billing.plans.headlineSection')}
        </Text>
        <IntervalToggle testID="subs-plans-headline-interval" value={interval} onChange={setInterval} />
      </View>

      <Card testID="subs-plan-free" style={isFreeCurrent ? { borderColor: colors.primary } : null}>
        <CardHeader>
          <View style={styles.titleRow}>
            <CardTitle size="lg" style={styles.fill}>
              {t('billing.plans.free.name')}
            </CardTitle>
            {isFreeCurrent ? (
              <Badge variant="secondary" testID="subs-plan-free-current">
                {t('billing.plans.currentPlan')}
              </Badge>
            ) : null}
          </View>
          <Text size="sm" muted>
            {t('billing.plans.free.tagline')}
          </Text>
        </CardHeader>
        <CardContent style={styles.cardBody}>
          <Text size="2xl" weight="700" style={styles.bigPrice}>
            {t('billing.plans.free.price')}
          </Text>
          <FeatureLine>{`${t('billing.features.voiceLive')} · 15 ${t('billing.features.voiceLiveUnit')}`}</FeatureLine>
          <FeatureLine>{`${t('billing.features.liveRooms')} · ${t('walletSubscriptionsNative.plans.freeLiveRooms')}`}</FeatureLine>
          <FeatureLine>{`${t('billing.features.storage')} · 100 MB`}</FeatureLine>
        </CardContent>
      </Card>

      <Card testID="subs-plan-premium" style={{ borderColor: colors.primary }}>
        <CardHeader>
          <View style={styles.titleRow}>
            <CardTitle size="lg" style={styles.fill}>
              {t('billing.plans.premium.name')}
            </CardTitle>
            {currentPlanKey === 'premium' ? (
              <Badge variant="default" testID="subs-plan-premium-current">
                {t('billing.plans.currentPlan')}
              </Badge>
            ) : null}
          </View>
          <Text size="sm" muted>
            {t('billing.plans.premium.tagline')}
          </Text>
        </CardHeader>
        <CardContent style={styles.cardBody}>
          <View>
            <View testID="subs-plan-premium-price">
              <PriceLine big interval={interval} amount={`€${fmtNumber(language, priceEur, { maximumFractionDigits: 2 })}`} />
            </View>
            {interval === 'year' ? (
              <Badge variant="secondary" style={styles.saveBadge} testID="subs-plan-premium-save">
                {t('billing.plans.saveAnnual')}
              </Badge>
            ) : null}
          </View>
          <FeatureLine>{`${t('billing.features.voiceLive')} · 30 ${t('billing.features.voiceLiveUnit')}`}</FeatureLine>
          <FeatureLine>{`${t('billing.features.liveRooms')} · 5 ${t('billing.features.liveRoomsUnit')}`}</FeatureLine>
          <FeatureLine>{`${t('billing.features.storage')} · 5 GB`}</FeatureLine>
          <FeatureLine>{t('billing.features.priorityPractitioner')}</FeatureLine>
          <Text size="xs" muted>
            {t('billing.plans.trial14')}
          </Text>
          {!hideCta && currentPlanKey !== 'premium' ? (
            <Button testID="subs-plan-premium-choose" onPress={handleChoosePremium} disabled={checkout.isPending} style={styles.fullWidth}>
              {t('billing.plans.selectPlan')}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </View>
  );
}

type BigPlan = 'premium_5x' | 'premium_20x';

export function PlansGridExpanded({ currentPlanKey }: { currentPlanKey: string }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(currentPlanKey === 'premium_5x' || currentPlanKey === 'premium_20x');
  const [interval, setInterval] = useState<Interval>('month');
  const checkout = useStartSubscriptionCheckout();
  const openBillingUrl = useOpenBillingUrl();

  const handleChoose = async (planKey: BigPlan) => {
    try {
      const priceKey =
        planKey === 'premium_5x'
          ? interval === 'month'
            ? 'premium_5x_monthly'
            : 'premium_5x_annual'
          : interval === 'month'
            ? 'premium_20x_monthly'
            : 'premium_20x_annual';
      const result = await checkout.mutateAsync({ priceKey });
      openBillingUrl(result?.url);
    } catch {
      // web: billingFetch already surfaced
    }
  };

  const hostPriceEur = (interval === 'month' ? HOST_MONTHLY : HOST_ANNUAL) / 100;
  const communityPriceEur = (interval === 'month' ? COMMUNITY_MONTHLY : COMMUNITY_ANNUAL) / 100;

  const planCard = (planKey: BigPlan, price: number, crown: boolean) => (
    <Card key={planKey} testID={`subs-plan-${planKey}`} style={currentPlanKey === planKey ? { borderColor: colors.primary } : null}>
      <CardContent style={[styles.cardBody, styles.compactBody]}>
        <View style={styles.titleRow}>
          <View style={[styles.titleRow, styles.fill]}>
            {crown ? <BillingIcon name="Crown" size={16} /> : null}
            <Text weight="600" accessibilityRole="header">
              {t(`billing.plans.${planKey}.name`)}
            </Text>
          </View>
          <Badge variant="outline">{t(`billing.plans.${planKey}.ribbon`)}</Badge>
        </View>
        <Text size="xs" muted>
          {t(`billing.plans.${planKey}.tagline`)}
        </Text>
        <View testID={`subs-plan-${planKey}-price`}>
          <PriceLine interval={interval} amount={`€${fmtNumber(language, price, { maximumFractionDigits: 0 })}`} />
        </View>
        {currentPlanKey !== planKey ? (
          <Button testID={`subs-plan-${planKey}-choose`} variant="outline" onPress={() => void handleChoose(planKey)} disabled={checkout.isPending} style={styles.fullWidth}>
            {t('billing.plans.selectPlan')}
          </Button>
        ) : (
          <Badge variant="default" style={styles.currentWide} testID={`subs-plan-${planKey}-current`}>
            {t('billing.plans.currentPlan')}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card testID="subs-plans-expanded">
      <CardHeader>
        <Pressable
          testID="subs-plans-expanded-toggle"
          onPress={() => setExpanded(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={t('billing.plans.needMoreTitle')}
          style={styles.disclosure}
        >
          <View style={styles.fill}>
            <CardTitle size="base">{t('billing.plans.needMoreTitle')}</CardTitle>
            <Text size="sm" muted style={styles.disclosureBody}>
              {t('billing.plans.needMoreBody')}
            </Text>
          </View>
          <BillingIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={20} />
        </Pressable>
      </CardHeader>

      {expanded ? (
        <CardContent testID="subs-plans-expanded-content" style={styles.cardBody}>
          <View style={styles.endRow}>
            <IntervalToggle testID="subs-plans-expanded-interval" value={interval} onChange={setInterval} />
          </View>
          {planCard('premium_5x', hostPriceEur, false)}
          {planCard('premium_20x', communityPriceEur, true)}
        </CardContent>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  bigPrice: { fontSize: 30, lineHeight: 36 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fill: { flex: 1 },
  cardBody: { gap: 12 },
  compactBody: { paddingTop: 16 },
  featureLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  saveBadge: { marginTop: 4 },
  fullWidth: { alignSelf: 'stretch' },
  currentWide: { alignSelf: 'stretch', justifyContent: 'center' },
  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disclosureBody: { marginTop: 4 },
  endRow: { flexDirection: 'row', justifyContent: 'flex-end' },
});
