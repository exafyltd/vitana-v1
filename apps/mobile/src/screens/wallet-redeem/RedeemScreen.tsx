/**
 * VTID-05423 (native-wave2-wallet-r2/wallet-redeem) — `/redeem?voucher=<code>`,
 * the native twin of `src/pages/RedeemVoucher.tsx` (route `src/App.tsx:849`,
 * "Public Routes - No Auth Required", no AuthGuard). It lives in the `(public)`
 * group, so a signed-out visitor reaches it exactly as on the web (plan
 * decision 2a).
 *
 * States, in the web's order: no code → "Invalid link"; auth or voucher
 * loading → form skeleton; lookup error / no voucher → "Voucher not found";
 * already redeemed → "Already redeemed"; expired → "Voucher expired"; claimed
 * here → "Voucher claimed!"; signed out → RedemptionLanding; signed in →
 * RedemptionConfirm. The phone branch only (no desktop Spotlight frame).
 *
 * Ungated on iOS, as today: a voucher is a code claim, not a purchase
 * (requirements R3.2) — no iOS purchase gate on this screen.
 *
 * Not ported: the web's `canvas-confetti` burst on a successful claim (a web
 * canvas effect with no kit or token equivalent; the success state is the same).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { withAlpha } from '../../ports/wallet-redeem';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from '../../auth/AuthProvider';
import { ConfigMissing } from '../ConfigMissing';
import { ClaimVoucherError, useClaimVoucher, useVoucherByCode } from './data/vouchers';
import { IconCircle, RedemptionConfirm, RedemptionLanding } from './Redemption';
import { tierName } from './tiers';

type Action = { testID: string; labelKey: string; href: string; variant?: 'default' | 'secondary' };

const GO_MAXINA: Action = { testID: 'redeem-go-maxina', labelKey: 'screens.redeemvoucher.goMaxina', href: '/maxina' };

/** The centred state column (web `stateClass`): icon, title, text, buttons. */
function StateView({ testID, icon, color, background, size = 64, title, body, actions }: { testID: string; icon: string; color: string; background: string; size?: number; title: string; body: string; actions: Action[] }) {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <ScrollView testID={testID} style={{ backgroundColor: colors.background }} contentContainerStyle={styles.state}>
      <View style={styles.column}>
        <IconCircle name={icon} color={color} background={background} size={size} />
        <Text variant="title" size="2xl" accessibilityRole="header" style={styles.center}>
          {title}
        </Text>
        <Text muted style={[styles.center, styles.body]}>
          {body}
        </Text>
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button key={a.testID} testID={a.testID} variant={a.variant ?? 'default'} style={styles.pill} onPress={() => router.push(a.href as never)}>
              {t(a.labelKey)}
            </Button>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/** web `<ArchetypeSkeleton archetype="form" />` + "Loading your gift voucher…" (SR-20: a skeleton, never a page spinner). */
function LoadingView() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const label = t('screens.redeemvoucher.loadingYourGiftVoucher');
  return (
    <ScrollView testID="redeem-loading" style={{ backgroundColor: colors.background }} contentContainerStyle={styles.state}>
      <View style={styles.form} accessibilityLabel={label}>
        <Skeleton style={styles.skTitle} />
        <Skeleton style={styles.skLine} />
        <Skeleton style={styles.skField} />
        <Skeleton style={styles.skField} />
        <Skeleton style={styles.skButton} />
        <Text muted style={[styles.center, styles.loadingText]}>
          {label}
        </Text>
      </View>
    </ScrollView>
  );
}

export function RedeemScreen() {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user, loading: authLoading, configMissing } = useAuth();
  const params = useLocalSearchParams<{ voucher?: string | string[] }>();
  const voucherCode = typeof params.voucher === 'string' ? params.voucher : Array.isArray(params.voucher) ? (params.voucher[0] ?? '') : '';
  const [redeemed, setRedeemed] = useState(false);
  const { data: voucherData, isLoading: voucherLoading, error: voucherError } = useVoucherByCode(voucherCode);
  const claim = useClaimVoucher();

  if (configMissing) return <ConfigMissing keys={configMissing} />;

  const handleClaim = async () => {
    if (!voucherData?.voucher?.id || !user?.id) return;
    try {
      await claim.mutateAsync({ voucherId: voucherData.voucher.id, userId: user.id });
      setRedeemed(true);
    } catch {
      // shown through claim.error (web: console.error("Claim failed:"))
    }
  };

  const destructive = { color: colors.destructive, background: withAlpha(colors.destructive, 0.1) };

  if (!voucherCode) {
    return <StateView testID="redeem-invalid-link" icon="AlertCircle" {...destructive} title={t('screens.redeemvoucher.invalidLink')} body={t('screens.redeemvoucher.thisRedemptionLinkMissingVoucherCode')} actions={[GO_MAXINA]} />;
  }

  if (authLoading || voucherLoading) return <LoadingView />;

  if (voucherError || !voucherData?.voucher) {
    return <StateView testID="redeem-not-found" icon="AlertCircle" {...destructive} title={t('screens.redeemvoucher.voucherNotFound')} body={t('screens.redeemvoucher.weCouldnTFindVoucherWith')} actions={[GO_MAXINA]} />;
  }

  if (voucherData.voucher.status === 'redeemed' && !redeemed) {
    return (
      <StateView
        testID="redeem-already-redeemed"
        icon="Gift"
        color={colors.statusWarning}
        background={withAlpha(colors.statusWarning, 0.1)}
        title={t('screens.redeemvoucher.alreadyRedeemed')}
        body={t('screens.redeemvoucher.thisVoucherHasAlreadyClaimedIf')}
        actions={[GO_MAXINA]}
      />
    );
  }

  if (voucherData.voucher.expires_at && new Date(voucherData.voucher.expires_at) < new Date()) {
    return (
      <StateView
        testID="redeem-expired"
        icon="Gift"
        color={colors.mutedForeground}
        background={colors.muted}
        title={t('screens.redeemvoucher.voucherExpired')}
        body={t('screens.redeemvoucher.thisVoucherHasExpiredCanNo')}
        actions={[GO_MAXINA]}
      />
    );
  }

  if (redeemed) {
    const value0 = (voucherData.order ? tierName(t, voucherData.voucher.tier) : '') || t('walletRedeemNative.wellnessFallback');
    return (
      <StateView
        testID="redeem-claimed"
        icon="CheckCircle"
        size={80}
        color={colors.statusSuccess}
        background={withAlpha(colors.statusSuccess, 0.1)}
        title={t('screens.redeemvoucher.voucherClaimed')}
        body={t('screens.redeemvoucher.yourValue0VoucherHasAddedYour', { value0 })}
        actions={[
          { testID: 'redeem-view-wallet', labelKey: 'screens.redeemvoucher.viewWallet', href: '/wallet' },
          { testID: 'redeem-browse-events', labelKey: 'screens.redeemvoucher.browseEvents', href: '/comm/events-meetups', variant: 'secondary' },
        ]}
      />
    );
  }

  if (!user) return <RedemptionLanding voucherData={voucherData} voucherCode={voucherCode} />;

  const claimError = claim.error ? (claim.error instanceof ClaimVoucherError ? t('walletRedeemNative.claimFailed') : claim.error.message) : null;
  return <RedemptionConfirm voucherData={voucherData} onClaim={() => void handleClaim()} isLoading={claim.isPending} error={claimError} />;
}

const styles = StyleSheet.create({
  state: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  column: { width: '100%', maxWidth: 448, alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  body: { marginBottom: 16 },
  actions: { gap: 12, alignSelf: 'stretch', alignItems: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 24 },
  form: { width: '100%', maxWidth: 448, gap: 12 },
  skTitle: { height: 28, width: '60%' },
  skLine: { height: 16, width: '80%' },
  skField: { height: 44, width: '100%' },
  skButton: { height: 44, width: '100%', marginTop: 8 },
  loadingText: { marginTop: 16 },
});
