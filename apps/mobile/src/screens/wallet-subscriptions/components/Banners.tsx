/**
 * VTID-05425 — native twins of the web subscription banners and info blocks:
 *  - `PrivacyFirstPromises` (src/components/subscription/PrivacyFirstPromises.tsx);
 *  - `LaunchGrantBanner` (LaunchGrantBanner.tsx): only for the launch
 *    auto-grant, future period end, not dismissed; the dismissal is stored
 *    per device under the web's key (`localStorage` → AsyncStorage);
 *  - `FoundingBanner` (FoundingBanner.tsx): the founding-campaign counter for
 *    members not on a paid plan (public GET /billing/founding-status, 30 s);
 *  - `AddExtraMinutesTile` (AddExtraMinutesTile.tsx): the three credit packs,
 *    "Buy" → `BillingActions.startCreditsCheckout` (no call by default);
 *  - `WhySubscribeFAQ` (WhySubscribeFAQ.tsx): the four-question accordion.
 * None of the web components reads `isIAPRestricted`; none is gated here
 * (requirements R3.2).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, IconButton, Text, useUITheme } from '../../../ports/ui';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, BillingIcon, type BillingGlyph } from '../../../ports/billing';
import { useI18n } from '../../../i18n/I18nProvider';
import { deviceStorage } from '../../../identity/device-storage';
import { fmtDate } from '../format';
import { openBillingUrl, useBilling, useFoundingStatus, useStartCreditsCheckout, type BillingMe } from '../data/billing';

const PROMISES: ReadonlyArray<{ icon: BillingGlyph; key: string }> = [
  { icon: 'Shield', key: 'owned' },
  { icon: 'ShieldOff', key: 'noSell' },
  { icon: 'Sprout', key: 'earn' },
  { icon: 'ToggleRight', key: 'control' },
];

export function PrivacyFirstPromises(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="subs-promises" style={styles.section}>
      <View style={styles.centered}>
        <Text size="2xl" weight="600" accessibilityRole="header" style={styles.centerText}>
          {t('billing.promises.anchorHeading')}
        </Text>
        <Text size="sm" muted style={styles.centerText}>
          {t('billing.promises.subheading')}
        </Text>
      </View>
      {PROMISES.map(({ icon, key }) => (
        <Card key={key} testID={`subs-promise-${key}`} style={{ backgroundColor: colors.muted }}>
          <CardContent style={[styles.body, styles.padded]}>
            <BillingIcon name={icon} size={20} color={colors.primary} />
            <Text size="sm" weight="500">
              {t(`billing.promises.${key}.title`)}
            </Text>
            <Text size="xs" muted>
              {t(`billing.promises.${key}.body`)}
            </Text>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}

const AUTO_GRANT_SOURCE = 'launch_auto_grant_2026';

/** The web key, so a dismissal means the same thing on both. */
export function launchGrantDismissKey(periodEnd: string | null): string {
  return `vitana.launch_grant_banner.dismissed.${periodEnd ?? 'unknown'}`;
}

export function LaunchGrantBanner({ data }: { data: BillingMe }): ReactElement | null {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const isAutoGrant = data.plan.source === AUTO_GRANT_SOURCE;
  const periodEnd = data.plan.current_period_end;
  const dismissKey = launchGrantDismissKey(periodEnd);
  // null = not read yet: render nothing until the stored flag is known (no flash).
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(deviceStorage.getItem(dismissKey)).then((v) => {
      if (!cancelled) setDismissed(v === '1');
    });
    return () => {
      cancelled = true;
    };
  }, [dismissKey]);

  if (!isAutoGrant) return null;
  if (!periodEnd) return null;
  if (new Date(periodEnd).getTime() < Date.now()) return null;
  if (dismissed !== false) return null;

  const endsLabel = fmtDate(language, periodEnd, { day: 'numeric', month: 'long', year: 'numeric' });
  const onDismiss = () => {
    setDismissed(true);
    void deviceStorage.setItem(dismissKey, '1');
  };

  return (
    <Card testID="subs-launch-grant" style={{ borderColor: colors.statusSuccess, backgroundColor: colors.statusSuccessSubtle }}>
      <CardContent style={[styles.bannerRow, styles.padded]}>
        <BillingIcon name="Gift" size={20} color={colors.statusSuccess} />
        <View style={[styles.fill, styles.tight]}>
          <Text size="sm" weight="600">
            {t('billing.launchGrant.title')}
          </Text>
          <Text size="sm" muted>
            {t('billing.launchGrant.body', { endsAt: endsLabel })}
          </Text>
          <Text size="xs" muted>
            {t('billing.launchGrant.noAction')}
          </Text>
        </View>
        <IconButton testID="subs-launch-grant-dismiss" name="X" size={16} onPress={onDismiss} accessibilityLabel={t('billing.launchGrant.dismissAria')} />
      </CardContent>
    </Card>
  );
}

export function FoundingBanner(): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const billing = useBilling();
  const isPaidUser = !!billing.data && billing.data.plan.plan_key !== 'free' && billing.data.plan.status !== 'free';
  const { data: status } = useFoundingStatus(!isPaidUser);

  if (isPaidUser) return null;
  if (!status || !status.active || !status.code || !status.max_uses) return null;

  const usesCount = status.uses_count ?? 0;
  const max = status.max_uses;
  const remaining = status.remaining ?? Math.max(0, max - usesCount);

  return (
    <Card testID="subs-founding" style={{ borderColor: colors.statusWarning, backgroundColor: colors.statusWarningSubtle }}>
      <CardContent style={[styles.bannerRow, styles.padded]}>
        <BillingIcon name="Sparkles" size={20} color={colors.statusWarning} />
        <View style={[styles.fill, styles.tight]}>
          <Text size="sm" weight="600">
            {t('billing.founding.bannerTitle', { max })}
          </Text>
          <Text size="xs" muted>
            {t('billing.founding.bannerBody', { code: status.code })}
          </Text>
        </View>
        <Badge variant="outline" testID="subs-founding-remaining">
          {t('billing.founding.spotsRemaining', { remaining, max })}
        </Badge>
      </CardContent>
    </Card>
  );
}

const PACKS = [
  { packKey: 'starter', labelKey: 'billing.creditPacks.starter', priceKey: 'billing.creditPacks.starterShort', priceEur: '€4.99' },
  { packKey: 'boost', labelKey: 'billing.creditPacks.boost', priceKey: 'billing.creditPacks.boostShort', priceEur: '€19.99' },
  { packKey: 'power', labelKey: 'billing.creditPacks.power', priceKey: 'billing.creditPacks.powerShort', priceEur: '€99' },
] as const;

export function AddExtraMinutesTile(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const checkout = useStartCreditsCheckout();

  const handleBuy = async (packKey: string) => {
    try {
      const result = await checkout.mutateAsync({ packKey });
      openBillingUrl(result?.url);
    } catch {
      // web: billingFetch already surfaced
    }
  };

  return (
    <Card testID="subs-credit-packs">
      <CardHeader>
        <View style={styles.titleRow}>
          <BillingIcon name="Zap" size={20} color={colors.primary} />
          <CardTitle size="base" style={styles.fill}>
            {t('billing.creditPacks.title')}
          </CardTitle>
        </View>
        <Text size="sm" muted>
          {t('billing.creditPacks.subtitle')}
        </Text>
      </CardHeader>
      <CardContent style={styles.body}>
        {PACKS.map((p) => (
          <Card key={p.packKey} testID={`subs-pack-${p.packKey}`}>
            <CardContent style={[styles.body, styles.padded]}>
              <Text weight="600">{t(p.priceKey)}</Text>
              <Text size="xs" muted>
                {t(p.labelKey)}
              </Text>
              <Text size="xl" weight="700">
                {p.priceEur}
              </Text>
              <Button testID={`subs-pack-${p.packKey}-buy`} variant="outline" size="sm" onPress={() => void handleBuy(p.packKey)} disabled={checkout.isPending} style={styles.fullWidth}>
                {t('billing.creditPacks.buy')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}

const FAQ_ITEMS = [1, 2, 3, 4] as const;

export function WhySubscribeFAQ(): ReactElement {
  const { t } = useI18n();
  return (
    <Card testID="subs-faq">
      <CardHeader>
        <CardTitle size="base">{t('billing.faq.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((i) => (
            <AccordionItem key={i} value={`q${i}`}>
              <AccordionTrigger testID={`subs-faq-q${i}`}>
                <Text size="sm" weight="500">
                  {t(`billing.faq.q${i}`)}
                </Text>
              </AccordionTrigger>
              <AccordionContent testID={`subs-faq-a${i}`}>
                <Text size="sm" muted>
                  {t(`billing.faq.a${i}`)}
                </Text>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  centered: { alignItems: 'center', gap: 4 },
  centerText: { textAlign: 'center' },
  body: { gap: 8 },
  padded: { paddingTop: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
  tight: { gap: 2 },
  fullWidth: { alignSelf: 'stretch' },
});
