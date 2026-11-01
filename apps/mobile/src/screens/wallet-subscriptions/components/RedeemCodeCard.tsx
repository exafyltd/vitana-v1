/**
 * VTID-05425 — native twin of the web "Got a code?" card
 * (src/components/subscription/RedeemCodeCard.tsx). Same normalisation
 * (upper-case, A–Z 0–9 and '-', 32 chars), same 4-char minimum, same
 * error-code → catalog-key map, same success card (founding variant), and the
 * same deep-link behaviour: arriving with `?code=` submits once and clears the
 * param. The claim goes to `BillingActions.redeemCode` (../data/actions.ts;
 * the default makes no call). A code claim is not a purchase; the web card is
 * ungated, so is this one (requirements R3.2).
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, CardContent, CardHeader, CardTitle, Text, TextInput, notifyError, useUITheme } from '../../../ports/ui';
import { BillingIcon } from '../../../ports/billing';
import { useI18n } from '../../../i18n/I18nProvider';
import { navigateToWebPath } from '../../../navigation/navigate';
import { fmtDate } from '../format';
import { errorCodeOf, useRedeemCode } from '../data/billing';

export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

/** Web `mapError`: the backend error code → its catalog key. */
export function redeemErrorKey(errorCode?: string): string {
  switch (errorCode) {
    case 'INVALID_CODE':
      return 'billing.redeemCard.error.invalid';
    case 'EXPIRED':
    case 'EXPIRED_OR_INACTIVE':
      return 'billing.redeemCard.error.expired';
    case 'MAX_USES_REACHED':
      return 'billing.redeemCard.error.maxUsed';
    case 'ALREADY_REDEEMED':
      return 'billing.redeemCard.error.alreadyRedeemed';
    case 'STRIPE_SUB_ACTIVE':
      return 'billing.redeemCard.error.stripeActive';
    case 'BUDGET_EXHAUSTED':
      return 'billing.redeemCard.error.budgetExhausted';
    default:
      return 'billing.redeemCard.error.generic';
  }
}

type RedeemSuccess = { granted_plan: string; granted_until: string; uses_count?: number; max_uses?: number; campaign?: string };

export function RedeemCodeCard(): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = (Array.isArray(params.code) ? params.code[0] : params.code) ?? '';
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [success, setSuccess] = useState<RedeemSuccess | null>(null);
  const redeem = useRedeemCode();
  const autoSubmitted = useRef(false);

  const submit = async (value: string) => {
    if (!value || value.length < 4) return;
    try {
      const result = await redeem.mutateAsync({ code: value });
      // null: the default BillingActions made no call (it already told the member to finish on the web).
      if (!result) return;
      if (result.ok && result.granted_until) {
        setSuccess({
          granted_plan: result.granted_plan || 'premium',
          granted_until: result.granted_until,
          uses_count: result.uses_count,
          max_uses: result.max_uses,
          campaign: result.campaign,
        });
      } else {
        notifyError(redeemErrorKey(result.error));
      }
    } catch (err: unknown) {
      notifyError(redeemErrorKey(errorCodeOf(err)));
    }
  };

  // Web: auto-submit once when arriving via a deep link with ?code=…, then clean the URL.
  useEffect(() => {
    if (autoSubmitted.current) return;
    autoSubmitted.current = true;
    if (initialCode && !success && !redeem.isPending) {
      void submit(normalizeCode(initialCode));
      router.setParams({ code: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (success) {
    const isFounding = success.campaign === 'founding_500' && success.uses_count !== undefined && success.max_uses !== undefined;
    return (
      <Card testID="subs-redeem-success" style={{ borderColor: colors.primary }}>
        <CardContent style={[styles.body, styles.padded]}>
          <View style={styles.titleRow}>
            <BillingIcon name="CheckCircle2" size={24} color={colors.primary} />
            <Text size="lg" weight="600" accessibilityRole="header">
              {t('billing.redeemCard.successTitle')}
            </Text>
          </View>
          <Text size="sm" testID="subs-redeem-success-body">
            {isFounding
              ? t('billing.redeemCard.founding', { position: success.uses_count as number, max: success.max_uses as number })
              : t('billing.redeemCard.successBody', { date: fmtDate(language, success.granted_until) })}
          </Text>
          <Button testID="subs-redeem-view-plans" variant="outline" size="sm" onPress={() => navigateToWebPath('/wallet/subscriptions')}>
            {t('billing.state.viewPlans')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card testID="subs-redeem">
      <CardHeader style={styles.header}>
        <View style={styles.titleRow}>
          <BillingIcon name="Gift" size={16} color={colors.primary} />
          <CardTitle size="base">{t('billing.redeemCard.title')}</CardTitle>
        </View>
      </CardHeader>
      <CardContent style={styles.formRow}>
        <View style={styles.fill}>
          <TextInput
            testID="subs-redeem-input"
            value={code}
            onChangeText={(v) => setCode(normalizeCode(v))}
            placeholder={t('billing.redeemCard.placeholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel={t('billing.redeemCard.title')}
            onSubmitEditing={() => void submit(code)}
          />
        </View>
        <Button testID="subs-redeem-submit" onPress={() => void submit(code)} disabled={redeem.isPending || code.length < 4}>
          {redeem.isPending ? t('billing.redeemCard.redeeming') : t('billing.redeemCard.button')}
        </Button>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { gap: 12 },
  padded: { paddingTop: 20 },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fill: { flex: 1 },
});
