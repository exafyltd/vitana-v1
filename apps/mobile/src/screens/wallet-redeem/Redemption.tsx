/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — native twins of the two
 * web voucher components the redeem page renders:
 *
 *   RedemptionLanding  (src/components/voucher/RedemptionLanding.tsx) — a
 *                      signed-out visitor: the gift, the voucher card and
 *                      "Sign in to redeem" / "Create account", which open
 *                      `/maxina?redirectTo=/redeem?voucher=<code>[&mode=register]`.
 *   RedemptionConfirm  (src/components/voucher/RedemptionConfirm.tsx) — a
 *                      signed-in member: the voucher card and "Claim voucher".
 *
 * The mobile-web (non-embedded) branch: the sticky MAXINA header, the card,
 * the CTAs. Ports only; RTL-safe (logical start/end); every word from the
 * catalogs.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, useUITheme } from '../../ports/ui';
import { RedeemButtonIcon, RedeemIcon, useButtonForeground, withAlpha } from '../../ports/wallet-redeem';
import { useI18n } from '../../i18n/I18nProvider';
import type { VoucherLookupData } from './data/vouchers';
import { benefitKeys, formatVoucherValue, tierColor, tierIcon, tierName } from './tiers';

/** The header with the MAXINA mark (web `<img src="/images/maxina-logo.png" alt="MAXINA">`). */
function BrandHeader() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View testID="redeem-header" style={[styles.header, { backgroundColor: withAlpha(colors.background, 0.8), borderBottomColor: withAlpha(colors.border, 0.5) }]}>
      <Text size="xl" weight="700" accessibilityRole="header" accessibilityLabel={t('walletRedeemNative.brand')} style={styles.brand}>
        {t('walletRedeemNative.brand')}
      </Text>
    </View>
  );
}

/** The round icon badge above a title (web `w-20 h-20 rounded-full bg-primary/10`). */
export function IconCircle({ name, color, background, size = 80, testID }: { name: string; color: string; background: string; size?: number; testID?: string }) {
  return (
    <View testID={testID} style={[styles.circle, { width: size, height: size, backgroundColor: background }]}>
      <RedeemIcon name={name} size={size / 2} color={color} />
    </View>
  );
}

/** The tier badge: tier icon + tier name on the tier colour. */
function TierBadge({ data }: { data: VoucherLookupData }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tier = data.voucher?.tier;
  const name = (data.order ? tierName(t, data.voucher?.tier ?? '') : '') || t('walletRedeemNative.tiers.experience.name');
  return (
    <View style={styles.badgeRow}>
      <View testID="redeem-tier-badge" style={[styles.badge, { backgroundColor: tierColor(colors, tier) }]}>
        <RedeemIcon name={tierIcon(tier)} size={24} color={colors.primaryForeground} />
        <Text size="sm" weight="600" color={colors.primaryForeground}>
          {name}
        </Text>
      </View>
    </View>
  );
}

function VoucherValue({ data }: { data: VoucherLookupData }) {
  const { t, language } = useI18n();
  return (
    <View style={styles.value}>
      <Text testID="redeem-value" weight="700" style={styles.valueText}>
        {formatVoucherValue(language, data.order?.amount_cents)}
      </Text>
      <Text size="sm" muted>
        {t('screens.voucher.voucherValue')}
      </Text>
    </View>
  );
}

function CodeBox({ code, background }: { code: string; background: string }) {
  const { t } = useI18n();
  return (
    <View style={[styles.codeBox, { backgroundColor: background }]}>
      <Text size="xs" muted style={styles.upper}>
        {t('screens.voucher.voucherCode')}
      </Text>
      <Text testID="redeem-code" size="xl" weight="700" style={styles.code}>
        {code}
      </Text>
    </View>
  );
}

function Benefits({ tier, headingKey }: { tier: string | null | undefined; headingKey: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={styles.benefits} testID="redeem-benefits">
      <Text size="xs" muted style={[styles.upper, styles.benefitsHeading]}>
        {t(headingKey)}
      </Text>
      {benefitKeys(tier).map((key) => (
        <View key={key} style={styles.benefit}>
          <RedeemIcon name="Check" size={14} color={colors.primary} />
          <Text size="sm" style={styles.flex}>
            {t(key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Page({ children, testID }: { children: ReactNode; testID: string }) {
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.page} stickyHeaderIndices={[0]}>
      <BrandHeader />
      <View style={styles.main}>{children}</View>
    </ScrollView>
  );
}

export function RedemptionLanding({ voucherData, voucherCode }: { voucherData: VoucherLookupData; voucherCode: string }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tier = voucherData.voucher?.tier;
  const tint = tierColor(colors, tier);
  const redirectTo = encodeURIComponent(`/redeem?voucher=${voucherCode}`);
  return (
    <Page testID="redeem-landing">
      <View style={styles.hero}>
        <IconCircle name="Gift" color={colors.primary} background={withAlpha(colors.primary, 0.1)} />
        <Text variant="title" size="2xl" accessibilityRole="header" style={styles.center}>
          {t('screens.voucher.youVeReceivedGift')}
        </Text>
        {voucherData.order?.buyer_name ? (
          <Text muted style={styles.center}>
            {t('screens.voucher.fromBuyer_name', { buyer_name: voucherData.order.buyer_name })}
          </Text>
        ) : null}
      </View>

      <View testID="redeem-voucher-card" style={[styles.card, { backgroundColor: withAlpha(tint, 0.1), borderColor: withAlpha(tint, 0.2) }]}>
        <TierBadge data={voucherData} />
        <VoucherValue data={voucherData} />
        <CodeBox code={voucherData.voucher?.code || voucherCode} background={withAlpha(colors.background, 0.5)} />
        <Benefits tier={tier} headingKey="screens.voucher.whatSIncluded" />
      </View>

      <View style={styles.ctas}>
        <Button testID="redeem-sign-in" size="lg" style={styles.cta} onPress={() => router.push(`/maxina?redirectTo=${redirectTo}` as never)}>
          {t('screens.voucher.signRedeem')}
        </Button>
        <Button testID="redeem-register" variant="secondary" size="lg" style={styles.cta} onPress={() => router.push(`/maxina?redirectTo=${redirectTo}&mode=register` as never)}>
          {t('screens.voucher.createAccount')}
        </Button>
        <Text size="xs" muted style={styles.center}>
          {t('screens.voucher.signCreateAccountClaimYourWellness')}
        </Text>
      </View>

      <View style={styles.features}>
        {(
          [
            ['Calendar', 'screens.voucher.events'],
            ['Users', 'screens.voucher.community'],
            ['Sparkles', 'screens.voucher.wellness'],
          ] as const
        ).map(([icon, key]) => (
          <View key={key} style={styles.feature}>
            <IconCircle name={icon} size={48} color={colors.primary} background={withAlpha(colors.primary, 0.1)} />
            <Text size="xs" muted style={styles.center}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>

      <Text size="xs" muted style={[styles.center, styles.footer]}>
        {t('screens.voucher.poweredByMaxina')}
      </Text>
    </Page>
  );
}

function ClaimLabel({ busy }: { busy: boolean }) {
  const { t } = useI18n();
  const foreground = useButtonForeground();
  return (
    <View style={styles.claimLabel}>
      {busy ? <ActivityIndicator testID="redeem-claiming" size="small" color={foreground ?? undefined} /> : <RedeemButtonIcon name="Gift" />}
      <Text size="lg" weight="600" color={foreground ?? undefined}>
        {t(busy ? 'screens.voucher.claiming' : 'screens.voucher.claimVoucher')}
      </Text>
    </View>
  );
}

export function RedemptionConfirm({ voucherData, onClaim, isLoading, error }: { voucherData: VoucherLookupData; onClaim: () => void; isLoading: boolean; error?: string | null }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <Page testID="redeem-confirm">
      <View style={styles.hero}>
        <IconCircle name="Gift" color={colors.primary} background={withAlpha(colors.primary, 0.1)} />
        <Text variant="title" size="2xl" accessibilityRole="header" style={styles.center}>
          {t('screens.voucher.claimYourGift')}
        </Text>
        <Text muted style={styles.center}>
          {t('screens.voucher.youReAboutAddThisVoucher')}
        </Text>
      </View>

      <View testID="redeem-voucher-card" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TierBadge data={voucherData} />
        <VoucherValue data={voucherData} />
        {voucherData.order?.buyer_name ? (
          <Text testID="redeem-gift-from" size="sm" muted style={styles.center}>
            {t('screens.voucher.giftFrom')}{' '}
            <Text size="sm" weight="500">
              {voucherData.order.buyer_name}
            </Text>
          </Text>
        ) : null}
        <CodeBox code={voucherData.voucher?.code ?? ''} background={withAlpha(colors.muted, 0.5)} />
        <Benefits tier={voucherData.voucher?.tier} headingKey="screens.voucher.whatYouLlGet" />
      </View>

      {error ? (
        <View testID="redeem-claim-error" accessibilityRole="alert" style={[styles.error, { backgroundColor: withAlpha(colors.destructive, 0.1), borderColor: withAlpha(colors.destructive, 0.2) }]}>
          <RedeemIcon name="AlertCircle" size={20} color={colors.destructive} />
          <Text size="sm" color={colors.destructive} style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : null}

      <View>
        <Button testID="redeem-claim" size="lg" style={styles.cta} disabled={isLoading} accessibilityLabel={t(isLoading ? 'screens.voucher.claiming' : 'screens.voucher.claimVoucher')} onPress={onClaim}>
          <ClaimLabel busy={isLoading} />
        </Button>
        <Text size="xs" muted style={[styles.center, styles.note]}>
          {t('screens.voucher.voucherWillAddedYourWallet')}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1 },
  header: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { letterSpacing: 2 },
  main: { width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 24, gap: 24 },
  hero: { alignItems: 'center', gap: 8 },
  circle: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 16 },
  badgeRow: { alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  value: { alignItems: 'center', gap: 4 },
  valueText: { fontSize: 36, lineHeight: 40, textAlign: 'center' },
  codeBox: { borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
  upper: { textTransform: 'uppercase', letterSpacing: 1 },
  code: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), letterSpacing: 4, textAlign: 'center' },
  benefits: { gap: 8 },
  benefitsHeading: { marginBottom: 0 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  ctas: { gap: 12 },
  cta: { alignSelf: 'stretch', borderRadius: 16 },
  features: { flexDirection: 'row', gap: 16, marginTop: 8 },
  feature: { flex: 1, alignItems: 'center', gap: 0 },
  footer: { paddingVertical: 24 },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 1 },
  claimLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  note: { paddingTop: 12 },
});
