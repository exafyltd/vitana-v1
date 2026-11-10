/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/packages/success` (exclusion row), twin of src/pages/PackagePurchaseSuccess.tsx
 * (phone branch: Spotlight off → the Panel, not the VCard):
 *
 *  - no `?purchase_id` or `?session_id` (:96-117): the package icon, "Missing
 *    purchase information", the body, View my orders → /discover/orders;
 *  - verifying (:119-131): the collection skeleton + "Confirming your purchase...";
 *    the `verify-package-payment` edge function with { purchase_id,
 *    session_id }; success → the "Payment confirmed!" toast;
 *  - error (:133-153): "Verification failed" + the error, View my orders;
 *  - success (:155-282): the check, "Payment successful!", "A confirmation
 *    has been sent to <email>", the package panel (image, title, description,
 *    "Includes:" items with quantities, "Total paid" — `Intl` en-US currency,
 *    like the web's own `formatPrice`), Redeem now → /discover/orders?tab=packages
 *    and View orders → /discover/orders.
 *
 * iOS IAP gate flag (R5): the confirmation of a package purchase (bought on
 * the web / Stripe). Today's behaviour, no iOS gate; drawer.ts `iapRestricted`
 * unchanged.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, CheckoutIcon, notify } from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { verifyPackagePayment, type PackagePurchase, type VerifyError } from './data/purchases';
import { Panel, PulseBlock } from './parts';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;

/** PackagePurchaseSuccess.tsx `formatPrice`: always en-US. */
export function packagePrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export function PackagePurchaseSuccessScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ purchase_id?: string; session_id?: string }>();
  const purchaseId = one(params.purchase_id);
  const sessionId = one(params.session_id);
  const [verifying, setVerifying] = useState(true);
  const [purchase, setPurchase] = useState<PackagePurchase | null>(null);
  const [error, setError] = useState<VerifyError | null>(null);

  useEffect(() => {
    let live = true;
    if (!purchaseId || !sessionId) {
      setVerifying(false);
      return;
    }
    void verifyPackagePayment(purchaseId, sessionId).then((r) => {
      if (!live) return;
      if ('purchase' in r) {
        setPurchase(r.purchase);
        notify('toasts.packagepurchasesuccess.paymentConfirmed', 'toasts.packagepurchasesuccess.yourPackagePurchaseSuccessful');
      } else {
        setError(r.error);
      }
      setVerifying(false);
    });
    return () => {
      live = false;
    };
  }, [purchaseId, sessionId]);

  const orders = (
    <Button onPress={() => navigateToWebPath('/discover/orders')} testID="package-view-my-orders">
      {t('screens.packagepurchasesuccess.viewMyOrders')}
    </Button>
  );

  if (!purchaseId || !sessionId) {
    return (
      <View style={styles.centerPage} testID="package-missing">
        <Panel style={styles.card}>
          <View style={styles.cardBody}>
            <CheckoutIcon name="Package" size={48} color={colors.destructive} />
            <Text size="xl" weight="600" accessibilityRole="header" style={styles.center}>
              {t('screens.packagepurchasesuccess.missingPurchaseInformation')}
            </Text>
            <Text muted style={styles.center}>
              {t('screens.packagepurchasesuccess.weCouldnTFindYourPurchase')}
            </Text>
            {orders}
          </View>
        </Panel>
      </View>
    );
  }

  if (verifying) {
    return (
      <View style={styles.loadingPage} testID="package-confirming">
        <PulseBlock height={160} radius={16} />
        <PulseBlock height={88} radius={12} />
        <PulseBlock height={88} radius={12} />
        <Text size="lg" muted style={styles.center}>
          {t('screens.packagepurchasesuccess.confirmingYourPurchase')}
        </Text>
      </View>
    );
  }

  if (error || !purchase) {
    const message = error ? ('message' in error ? error.message : t(error.key)) : t('discoverCommerceNative.commerce.package.unableToVerify');
    return (
      <View style={styles.centerPage} testID="package-error">
        <Panel style={styles.card}>
          <View style={styles.cardBody}>
            <CheckoutIcon name="Package" size={48} color={colors.destructive} />
            <Text size="xl" weight="600" accessibilityRole="header" style={styles.center}>
              {t('screens.packagepurchasesuccess.verificationFailed')}
            </Text>
            <Text muted style={styles.center} testID="package-error-message">
              {message}
            </Text>
            {orders}
          </View>
        </Panel>
      </View>
    );
  }

  const pkg = purchase.business_packages;
  const items = pkg?.package_items || [];
  return (
    <ScrollView contentContainerStyle={styles.page} testID="package-success">
      <View style={styles.headerBlock}>
        <View style={[styles.check, { backgroundColor: alpha(colors.statusSuccess, 0.1) }]}>
          <CheckoutIcon name="CheckCircle" size={40} color={colors.statusSuccess} />
        </View>
        <Text size="2xl" weight="700" accessibilityRole="header" style={styles.center}>
          {t('screens.packagepurchasesuccess.paymentSuccessful')}
        </Text>
        <Text muted style={styles.center}>
          {`${t('screens.packagepurchasesuccess.confirmationHasSent')} `}
          <Text weight="500">{purchase.buyer_email}</Text>
        </Text>
      </View>

      <Panel style={styles.overflow} testID="package-card">
        {pkg?.image_url ? <Image source={{ uri: pkg.image_url }} accessibilityLabel={pkg.title} style={styles.image} resizeMode="cover" /> : null}
        <View style={styles.pkgBody}>
          <View>
            <Text size="lg" weight="600" accessibilityRole="header">
              {pkg?.title}
            </Text>
            {pkg?.description ? (
              <Text size="sm" muted style={styles.mt4}>
                {pkg.description}
              </Text>
            ) : null}
          </View>
          {items.length > 0 ? (
            <View style={styles.items}>
              <Text size="sm" weight="500" muted>
                {t('screens.packagepurchasesuccess.includes')}
              </Text>
              {items.map((item) => (
                <View key={item.id} style={styles.inline} testID={`package-item-${item.id}`}>
                  <CheckoutIcon name="Gift" size={16} color={colors.primary} />
                  <Text size="sm">{`${item.quantity}x ${item.item_name}`}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={[styles.total, { borderTopColor: colors.border }]}>
            <Text muted>{t('screens.packagepurchasesuccess.totalPaid')}</Text>
            <Text size="lg" weight="600" testID="package-total">
              {packagePrice(purchase.total_amount_cents, purchase.currency)}
            </Text>
          </View>
        </View>
      </Panel>

      <View style={styles.buttons}>
        <Button onPress={() => navigateToWebPath('/discover/orders?tab=packages')} testID="package-redeem">
          <CheckoutIcon name="Gift" size={16} color={colors.primaryForeground} />
          {t('screens.packagepurchasesuccess.redeemNow')}
        </Button>
        <Button variant="outline" onPress={() => navigateToWebPath('/discover/orders')} testID="package-view-orders">
          <CheckoutIcon name="ShoppingBag" size={16} color={colors.foreground} />
          {t('screens.packagepurchasesuccess.viewOrders')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerPage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { maxWidth: 448, width: '100%' },
  cardBody: { padding: 24, alignItems: 'center', gap: 12 },
  center: { textAlign: 'center' },
  loadingPage: { padding: 24, gap: 16 },
  page: { padding: 24, gap: 24 },
  headerBlock: { alignItems: 'center', gap: 8 },
  check: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  overflow: { overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  pkgBody: { padding: 16, gap: 16 },
  mt4: { marginTop: 4 },
  items: { gap: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  buttons: { gap: 12 },
});
