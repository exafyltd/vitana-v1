/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/checkout/success` (exclusion row), twin of src/pages/CheckoutSuccess.tsx
 * (phone branch; the mobile StandardHeader shows only its title):
 *
 *  - `?checkout_id` (a completed universal-cart checkout): the gateway already
 *    completed the lines server-side, so the cached cart is refreshed once;
 *  - legacy `?session_id`: the "order confirmed" toast;
 *  - `?deposit_id` (the Stripe wallet top-up return): `GET /wallet/deposits/:id`
 *    every 2.5 s until succeeded / failed — "Confirming payment" (skeleton
 *    disc), then "Balance topped up" + the amount, or "Top-up failed"; "Back
 *    to cart" once terminal;
 *  - otherwise the order confirmation: the check, "Order confirmed!", the two
 *    lines, "What's next?" with the four steps, View my orders · Continue
 *    shopping, and the "Need help?" panel → /support.
 *
 * iOS IAP gate flag (requirements R5, highest priority): the `?deposit_id`
 * deposit-return leg of the wallet top-up, and the confirmation of a
 * checkout. Today's behaviour — no iOS gate (as on the web); drawer.ts:37-38
 * `iapRestricted` unchanged; gate extension deferred (program decision 5).
 */
import { useEffect, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Skeleton, Text, useUITheme } from '../../ports/ui';
import { alpha, CheckoutIcon, notify, useTokenColor, useUniversalCart } from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useDeposit } from './data/wallet';
import { useMoney } from './format';
import { Panel } from './parts';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;

export function CheckoutSuccessScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const money = useMoney();
  const category2 = useTokenColor('category-2');
  const params = useLocalSearchParams<{ session_id?: string; deposit_id?: string; checkout_id?: string }>();
  const sessionId = one(params.session_id);
  const depositId = one(params.deposit_id);
  const checkoutId = one(params.checkout_id);
  const { refresh } = useUniversalCart();
  const { deposit, isLoading: depositLoading, isTerminal } = useDeposit(depositId, { pollUntilTerminal: true });
  const succeeded = deposit?.status === 'succeeded';

  useEffect(() => {
    if (checkoutId) void refresh();
    if (sessionId) notify('toasts.checkoutsuccess.orderConfirmed', 'toasts.checkoutsuccess.yourPaymentSuccessfulCheckYourEmail');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, checkoutId]);

  if (depositId) {
    return (
      <ScrollView contentContainerStyle={styles.page} testID="deposit-return">
        <Panel>
          <View style={styles.hero}>
            {!isTerminal ? (
              <>
                <Skeleton style={styles.disc} />
                <Text size="lg" weight="700" accessibilityRole="header" style={styles.center} testID="deposit-checking">
                  {t('marketplaceCheckout.deposit.checkingTitle')}
                </Text>
                {depositLoading ? (
                  <Text size="sm" muted style={styles.center}>
                    {t('marketplaceCheckout.deposit.checkingBody')}
                  </Text>
                ) : null}
              </>
            ) : succeeded ? (
              <>
                <CheckoutIcon name="Wallet" size={80} color={colors.statusSuccess} />
                <Text size="lg" weight="700" accessibilityRole="header" style={styles.center} testID="deposit-succeeded">
                  {t('marketplaceCheckout.deposit.succeededTitle')}
                </Text>
                {deposit ? (
                  <Text size="sm" muted style={styles.center} testID="deposit-amount">
                    {`${t('marketplaceCheckout.deposit.amountLabel')}: ${money(deposit.amount_minor, deposit.currency)}`}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <CheckoutIcon name="XCircle" size={80} color={colors.statusError} />
                <Text size="lg" weight="700" accessibilityRole="header" style={styles.center} testID="deposit-failed">
                  {t('marketplaceCheckout.deposit.failedTitle')}
                </Text>
              </>
            )}
            {isTerminal ? (
              <Button size="lg" onPress={() => navigateToWebPath('/universal-cart')} testID="deposit-back-to-cart" style={styles.mt8}>
                {t('marketplaceCheckout.deposit.backToCart')}
                <CheckoutIcon name="ArrowRight" size={16} color={colors.primaryForeground} />
              </Button>
            ) : null}
          </View>
        </Panel>
      </ScrollView>
    );
  }

  const steps = [
    'screens.checkoutsuccess.orderConfirmationSentYourEmail',
    'screens.checkoutsuccess.yourItemsWillPreparedForShipment',
    'screens.checkoutsuccess.youLlReceiveTrackingInformationWithin',
    'screens.checkoutsuccess.expectedDelivery35BusinessDays',
  ];
  return (
    <ScrollView contentContainerStyle={styles.page} testID="checkout-success">
      <Panel>
        <View style={styles.hero}>
          <CheckoutIcon name="CheckCircle" size={80} color={colors.statusSuccess} />
          <Text size="lg" weight="700" accessibilityRole="header" style={styles.center}>
            {t('screens.checkoutsuccess.orderConfirmed')}
          </Text>
          <View style={styles.lines}>
            <Text muted style={styles.center}>
              {t('screens.checkoutsuccess.yourOrderHasSuccessfullyPlacedProcessed')}
            </Text>
            <Text size="sm" muted style={styles.center}>
              {t('screens.checkoutsuccess.youLlReceiveConfirmationEmailWith')}
            </Text>
          </View>
          <View style={[styles.next, { backgroundColor: alpha(category2, 0.1) }]}>
            <View style={styles.nextHead}>
              <CheckoutIcon name="Package" size={24} color={category2} />
              <Text size="lg" weight="600">
                {t('screens.checkoutsuccess.whatSNext')}
              </Text>
            </View>
            {steps.map((k) => (
              <Text key={k} size="sm">
                {t(k)}
              </Text>
            ))}
          </View>
          <View style={styles.buttons}>
            <Button size="lg" onPress={() => navigateToWebPath('/discover/orders')} testID="checkout-view-orders">
              {t('screens.checkoutsuccess.viewMyOrders')}
              <CheckoutIcon name="ArrowRight" size={16} color={colors.primaryForeground} />
            </Button>
            <Button variant="outline" size="lg" onPress={() => navigateToWebPath('/discover')} testID="checkout-continue">
              {t('screens.checkoutsuccess.continueShopping')}
            </Button>
          </View>
        </View>
      </Panel>
      <Panel>
        <View style={styles.help}>
          <Text weight="600" accessibilityRole="header">
            {t('screens.checkoutsuccess.needHelp')}
          </Text>
          <Text size="sm" muted>
            {t('screens.checkoutsuccess.ifYouHaveAnyQuestionsAbout')}
          </Text>
          <Button variant="outline" onPress={() => navigateToWebPath('/support')} style={styles.startSelf} testID="checkout-support">
            {t('screens.checkoutsuccess.contactSupport')}
          </Button>
        </View>
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 48, gap: 24 },
  hero: { padding: 48, paddingHorizontal: 24, alignItems: 'center', gap: 16 },
  disc: { width: 80, height: 80, borderRadius: 40 },
  center: { textAlign: 'center' },
  lines: { gap: 16, marginVertical: 16 },
  next: { alignSelf: 'stretch', borderRadius: 8, padding: 24, gap: 8 },
  nextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 },
  buttons: { alignSelf: 'stretch', gap: 12, marginTop: 16 },
  mt8: { marginTop: 16 },
  help: { padding: 24, gap: 12 },
  startSelf: { alignSelf: 'flex-start' },
});
