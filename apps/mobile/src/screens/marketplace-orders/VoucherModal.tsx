/**
 * VTID-05511 — twin of `src/components/voucher/MaxinaVoucherModal.tsx`, the
 * gift-voucher dialog the utility rail's Gift Voucher pill opens:
 *  - selection (:378-475): title + subtitle, the three tiers (test €0.49,
 *    experience €99, exclusive €199) with their catalog name and benefits
 *    (`voucher.tiers.<tier>.benefits`, a string array), the selected check,
 *    and "Buy voucher · €N" (disabled until a tier is picked);
 *  - loading (:477-490): "opening secure checkout";
 *  - buy (:141-166): the `stripe-create-voucher-checkout` edge function with
 *    `{ tier, returnTo }` (returnTo = this screen's route), then the Stripe
 *    page in expo-web-browser; a failure toasts `voucher.toast.checkoutFailed`
 *    and returns to the selection;
 *  - the return leg: the web reads `voucher_success` / `order_id` / `tier` on
 *    the Stripe return URL (:112-132). Natively the Stripe return lands on the
 *    web origin (success_url = request Origin, stripe-create-voucher-checkout
 *    /index.ts:147, :161), so the dialog keeps the order id the function
 *    returns (:179-184) and, when the browser closes (iOS), on AppState
 *    'active' (Android, where `openBrowserAsync` resolves at once) and on
 *    screen focus while the checkout is pending, re-reads the member's own
 *    `voucher_orders` row (briefly polled: the webhook can trail). `paid` →
 *    the success state; otherwise back to the selection, as the web's cancel
 *    return (`voucher_cancelled`, unhandled on the web) leaves it. The web's
 *    return params are handled too if such a link reaches the app;
 *  - success (:490-555): download (→ `voucher-download-pdf` with the member's
 *    session, then the mobile preview), send by e-mail, view in orders, done;
 *  - e-mail form (:557-640): recipient e-mail *, name, message → back / send
 *    (`voucher-send-email`, `voucher.toast.voucherSent`, then closes);
 *  - PDF preview (:642-760, the web's mobile branch with the share API):
 *    the voucher card, Save / Share (the system share sheet) and Download PDF
 *    (the signed PDF in the in-app browser).
 *
 * Rendered only where IAP is not restricted — UtilityBar `isIAPRestricted()`,
 * unchanged.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AppState, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, IconButton, Spinner, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, Dialog, DialogContent, notifySuccess, Textarea, useCommercePalette } from '../../ports/marketplace-orders';
import { catalogs, FALLBACK_LOCALE, isLocale } from '../../i18n';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { createVoucherCheckout, waitForPaidVoucherOrder, type VoucherTier } from './data/chrome';
import { downloadVoucherPdf, sendVoucherEmail, type VoucherPdfData } from './data/orders';

type Tier = VoucherTier;
type ModalState = 'selection' | 'loading' | 'success' | 'email-form' | 'pdf-preview';
const isTier = (v: unknown): v is Tier => v === 'test' || v === 'experience' || v === 'exclusive';

const TIERS: Array<{ id: VoucherTier; price: number; icon: string }> = [
  { id: 'test', price: 0.49, icon: 'Gift' },
  { id: 'experience', price: 99, icon: 'Sparkles' },
  { id: 'exclusive', price: 199, icon: 'Crown' },
];

/** `voucher.tiers.<tier>.benefits` — a string array in the catalog (the web reads the object). */
function benefitsFor(locale: string, tier: VoucherTier): string[] {
  const read = (l: string): unknown => {
    const v = (catalogs as Record<string, Record<string, unknown>>)[l]?.voucher as { tiers?: Record<string, { benefits?: unknown }> } | undefined;
    return v?.tiers?.[tier]?.benefits;
  };
  const own = isLocale(locale) ? read(locale) : undefined;
  const list = Array.isArray(own) ? own : read(FALLBACK_LOCALE);
  return Array.isArray(list) ? list.filter((b): b is string => typeof b === 'string') : [];
}

export function VoucherModal({ open, onOpenChange, returnTo }: { open: boolean; onOpenChange: (open: boolean) => void; returnTo: string }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const tierTint = [palette.success, palette.category2, palette.warning];
  const [selected, setSelected] = useState<Tier | null>(null);
  const [modalState, setModalState] = useState<ModalState>('selection');
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [completedTier, setCompletedTier] = useState<Tier | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [previewVoucher, setPreviewVoucher] = useState<VoucherPdfData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  /** The checkout opened in the browser and not yet seen paid. */
  const pending = useRef<{ orderId: string | undefined; tier: Tier } | null>(null);
  const checking = useRef(false);
  const handledReturn = useRef(false);
  const params = useLocalSearchParams<{ voucher_success?: string; voucher_cancelled?: string; order_id?: string; tier?: string }>();

  const reset = () => {
    pending.current = null;
    setSelected(null);
    setModalState('selection');
    setCompletedOrderId(null);
    setCompletedTier(null);
    setRecipientEmail('');
    setRecipientName('');
    setPersonalMessage('');
    setSignedPdfUrl(null);
    setPreviewVoucher(null);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // The web's Stripe return (:112-132), if the return link reaches the app.
  useEffect(() => {
    if (params.voucher_success === 'true' && params.order_id && !handledReturn.current) {
      handledReturn.current = true;
      pending.current = null;
      setCompletedOrderId(params.order_id);
      setCompletedTier(isTier(params.tier) ? params.tier : null);
      setModalState('success');
      onOpenChange(true);
      router.setParams({ voucher_success: undefined, order_id: undefined, tier: undefined });
    } else if (params.voucher_cancelled) {
      router.setParams({ voucher_cancelled: undefined });
    }
  }, [params.voucher_success, params.voucher_cancelled, params.order_id, params.tier, onOpenChange]);

  useEffect(() => {
    if (!open) handledReturn.current = false;
  }, [open]);

  /** Re-reads the pending checkout's order: paid → success, else the selection. */
  const checkPending = useCallback(async () => {
    const p = pending.current;
    if (!p || checking.current) return;
    checking.current = true;
    setModalState('loading');
    try {
      const order = await waitForPaidVoucherOrder(p.orderId);
      if (pending.current !== p) return;
      if (order) {
        pending.current = null;
        setCompletedOrderId(order.id);
        setCompletedTier(p.tier);
        setModalState('success');
      } else {
        setModalState('selection');
      }
    } catch {
      if (pending.current === p) setModalState('selection');
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pending.current) void checkPending();
    });
    return () => sub.remove();
  }, [checkPending]);

  useFocusEffect(
    useCallback(() => {
      if (pending.current) void checkPending();
    }, [checkPending]),
  );

  const buy = async () => {
    if (!selected) return;
    setModalState('loading');
    try {
      const data = await createVoucherCheckout(selected, returnTo);
      if (!data.url) {
        setModalState('selection');
        return;
      }
      pending.current = { orderId: data.order_id, tier: selected };
      const result = await WebBrowser.openBrowserAsync(data.url);
      // iOS resolves when the member closes the browser; Android ('opened') at once — AppState 'active' checks there.
      if (result.type !== 'opened') await checkPending();
    } catch {
      pending.current = null;
      notifyError('voucher.toast.checkoutFailed');
      setModalState('selection');
    }
  };

  const downloadPdf = async () => {
    if (!completedOrderId) {
      notifyError('voucher.toast.failedToLoadVoucher');
      return;
    }
    notify('voucher.toast.generatingVoucher');
    setDownloading(true);
    try {
      const result = await downloadVoucherPdf(completedOrderId);
      if (!result?.voucher || !result?.signedPdfUrl) {
        notifyError('voucher.toast.failedToLoadVoucher');
        return;
      }
      setPreviewVoucher(result.voucher);
      setSignedPdfUrl(result.signedPdfUrl);
      setModalState('pdf-preview');
    } catch {
      notifyError('voucher.toast.downloadFailed');
    } finally {
      setDownloading(false);
    }
  };

  const downloadDirect = async () => {
    if (!signedPdfUrl) return;
    try {
      await WebBrowser.openBrowserAsync(signedPdfUrl);
      notifySuccess('voucher.toast.downloadStarted');
    } catch {
      notifyError('voucher.toast.downloadFailedCopyLink');
    }
  };

  const shareUrl = async () => {
    if (!signedPdfUrl) return;
    try {
      const r = await Share.share({ title: t('voucher.preview.giftVoucher'), message: `${t('voucher.preview.giftVoucher')}\n${signedPdfUrl}`, url: signedPdfUrl });
      if (r.action === Share.sharedAction) notifySuccess('voucher.toast.voucherShared');
    } catch {
      await downloadDirect();
    }
  };

  const confirmSendEmail = async () => {
    if (!completedOrderId || !recipientEmail) {
      notifyError('voucher.toast.enterRecipientEmail');
      return;
    }
    notify('voucher.toast.sendingVoucherEmail');
    setSending(true);
    try {
      await sendVoucherEmail({ orderId: completedOrderId, recipientEmail, recipientName, message: personalMessage });
      notifySuccess('voucher.toast.voucherSent', undefined, { email: recipientEmail });
      close(false);
    } catch {
      notifyError('voucher.toast.downloadFailed');
    } finally {
      setSending(false);
    }
  };

  const viewOrders = () => {
    close(false);
    navigateToWebPath('/discover/orders?tab=vouchers');
  };

  const tierForDisplay = completedTier ?? selected;
  const price = selected ? TIERS.find((x) => x.id === selected)?.price : null;
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent testID="mo-voucher-modal">
        {modalState === 'loading' ? (
          <View style={styles.loading} testID="mo-voucher-loading">
            <Spinner accessibilityLabel={t('voucher.modal.openingCheckout')} />
            <Text size="sm" muted>
              {t('voucher.modal.openingCheckout')}
            </Text>
          </View>
        ) : modalState === 'success' ? (
          <View style={styles.section} testID="mo-voucher-success">
            <View style={styles.successHead}>
              <View style={[styles.successIcon, { backgroundColor: colors.statusSuccessSubtle }]}>
                <CommerceIcon name="Check" size={32} color={colors.statusSuccess} />
              </View>
              <Text size="lg" weight="600" accessibilityRole="header">
                {t('voucher.success.title')}
              </Text>
              <Text size="sm" muted>
                {t('voucher.success.ready', { tier: tierForDisplay ? t(`voucher.tiers.${tierForDisplay}.name`) : '' })}
              </Text>
            </View>
            <Button testID="mo-voucher-download" variant="outline" disabled={downloading} onPress={() => void downloadPdf()} style={styles.rowButton}>
              {downloading ? <Spinner /> : <CommerceIcon name="Download" size={16} color={colors.foreground} />}
              {t('voucher.success.download')}
            </Button>
            <Button testID="mo-voucher-send-email" variant="outline" onPress={() => setModalState('email-form')} style={styles.rowButton}>
              <CommerceIcon name="Mail" size={16} color={colors.foreground} />
              {t('voucher.success.sendEmail')}
            </Button>
            <Button testID="mo-voucher-view-orders" variant="ghost" onPress={viewOrders} style={styles.rowButton}>
              <CommerceIcon name="ShoppingBag" size={16} color={colors.mutedForeground} />
              {t('voucher.success.viewOrders')}
            </Button>
            <Button testID="mo-voucher-done" onPress={() => close(false)}>
              {t('voucher.success.done')}
            </Button>
          </View>
        ) : modalState === 'email-form' ? (
          <View style={styles.section} testID="mo-voucher-email-form">
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <CommerceIcon name="Mail" size={20} color={colors.primary} />
                <Text size="lg" weight="600" accessibilityRole="header">
                  {t('voucher.email.title')}
                </Text>
              </View>
              <Text size="sm" muted>
                {t('voucher.email.subtitle')}
              </Text>
            </View>
            <View style={styles.field}>
              <Text size="sm" weight="500">
                {t('voucher.email.recipientEmail')}
              </Text>
              <TextInput testID="mo-voucher-email-recipient" value={recipientEmail} onChangeText={setRecipientEmail} keyboardType="email-address" autoCapitalize="none" placeholder={t('screens.voucher.friendExampleCom')} accessibilityLabel={t('voucher.email.recipientEmail')} />
            </View>
            <View style={styles.field}>
              <Text size="sm" weight="500">
                {t('voucher.email.recipientName')}
              </Text>
              <TextInput testID="mo-voucher-email-name" value={recipientName} onChangeText={setRecipientName} placeholder={t('screens.voucher.jane')} accessibilityLabel={t('voucher.email.recipientName')} />
            </View>
            <View style={styles.field}>
              <Text size="sm" weight="500">
                {t('voucher.email.personalMessage')}
              </Text>
              <Textarea testID="mo-voucher-email-message" value={personalMessage} onChangeText={setPersonalMessage} placeholder={t('voucher.email.messagePlaceholder')} accessibilityLabel={t('voucher.email.personalMessage')} numberOfLines={3} />
            </View>
            <View style={styles.buttonRow}>
              <Button testID="mo-voucher-email-back" variant="outline" onPress={() => setModalState('success')} style={styles.flex}>
                {t('voucher.email.back')}
              </Button>
              <Button testID="mo-voucher-email-send" disabled={!recipientEmail || sending} onPress={() => void confirmSendEmail()} style={styles.flex}>
                {sending ? <Spinner /> : <CommerceIcon name="Send" size={16} color={colors.primaryForeground} />}
                {t('voucher.email.send')}
              </Button>
            </View>
          </View>
        ) : modalState === 'pdf-preview' && previewVoucher && signedPdfUrl ? (
          <View style={styles.section} testID="mo-voucher-pdf-preview">
            <View style={styles.previewHead}>
              <Text weight="600" accessibilityRole="header">
                {t('voucher.preview.title')}
              </Text>
              <IconButton testID="mo-voucher-pdf-close" name="X" size={16} accessibilityLabel={t('voucher.email.back')} onPress={() => {
                setSignedPdfUrl(null);
                setModalState('success');
              }} />
            </View>
            <ScrollView style={styles.list} contentContainerStyle={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text size="xl" weight="700" color={colors.primary} style={styles.center}>
                VITANA
              </Text>
              <Text size="xl" style={styles.center}>
                🎁
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('voucher.preview.giftVoucher').toUpperCase()}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: colors.primary }]}>
                <Text size="sm" weight="600" color={colors.primaryForeground}>
                  {(previewVoucher.tierName || previewVoucher.tier || '').toUpperCase()}
                </Text>
              </View>
              <Text size="xl" weight="700" style={styles.center}>
                {previewVoucher.price}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('voucher.preview.validUntil', { date: previewVoucher.expiresAt })}
              </Text>
              <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
                <Text size="xs" muted style={styles.center}>
                  {t('voucher.preview.voucherCode').toUpperCase()}
                </Text>
                <Text size="lg" weight="700" style={styles.code}>
                  {previewVoucher.code}
                </Text>
              </View>
              {previewVoucher.benefits?.length ? (
                <View style={styles.listBody}>
                  <Text size="xs" muted>
                    {t('voucher.preview.whatsIncluded').toUpperCase()}
                  </Text>
                  {previewVoucher.benefits.map((b, i) => (
                    <View key={i} style={styles.benefit}>
                      <CommerceIcon name="Check" size={16} color={colors.primary} />
                      <Text size="sm" style={styles.flex}>
                        {b}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
            <Button testID="mo-voucher-pdf-share" onPress={() => void shareUrl()}>
              <CommerceIcon name="Share2" size={16} color={colors.primaryForeground} />
              {t('voucher.preview.share')}
            </Button>
            <Button testID="mo-voucher-pdf-download" variant="outline" onPress={() => void downloadDirect()}>
              <CommerceIcon name="Download" size={16} color={colors.foreground} />
              {t('voucher.preview.downloadPdf')}
            </Button>
            <Text size="xs" muted style={styles.center}>
              {t('voucher.preview.shareHint')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <CommerceIcon name="Gift" size={20} color={colors.primary} />
                <Text size="lg" weight="600" accessibilityRole="header">
                  {t('voucher.modal.title')}
                </Text>
              </View>
              <Text size="sm" muted>
                {t('voucher.modal.subtitle')}
              </Text>
            </View>
            <ScrollView style={styles.list} contentContainerStyle={styles.listBody}>
              {TIERS.map((tier, i) => {
                const isSelected = selected === tier.id;
                return (
                  <Pressable
                    key={tier.id}
                    testID={`mo-voucher-tier-${tier.id}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setSelected(tier.id)}
                    style={[styles.tier, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? alpha(colors.primary, 0.05) : colors.background }]}
                  >
                    <View style={[styles.tierIcon, { backgroundColor: tierTint[i] }]}>
                      <CommerceIcon name={tier.icon} size={20} color={colors.primaryForeground} />
                    </View>
                    <View style={styles.flex}>
                      <View style={styles.tierHead}>
                        <Text weight="600">{t(`voucher.tiers.${tier.id}.name`)}</Text>
                        <Text size="lg" weight="700">{`€${tier.price}`}</Text>
                      </View>
                      {benefitsFor(locale, tier.id).map((b, j) => (
                        <View key={j} style={styles.benefit}>
                          <CommerceIcon name="Check" size={12} color={colors.primary} />
                          <Text size="xs" muted style={styles.flex}>
                            {b}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {isSelected ? (
                      <View style={[styles.check, { backgroundColor: colors.primary }]}>
                        <CommerceIcon name="Check" size={12} color={colors.primaryForeground} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button testID="mo-voucher-buy" disabled={!selected} onPress={() => void buy()}>
              <CommerceIcon name="Gift" size={16} color={colors.primaryForeground} />
              {price != null ? `${t('voucher.modal.buyVoucher')} · €${price}` : t('voucher.modal.buyVoucher')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: 4, paddingEnd: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { maxHeight: 420 },
  listBody: { gap: 12 },
  tier: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, borderWidth: 2 },
  tierIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tierHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  section: { gap: 8 },
  successHead: { alignItems: 'center', gap: 4, marginBottom: 16 },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  rowButton: { justifyContent: 'flex-start' },
  field: { gap: 4 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingEnd: 24 },
  card: { gap: 8, padding: 24, borderRadius: 16, borderWidth: 1 },
  center: { textAlign: 'center' },
  tierBadge: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  codeBox: { borderRadius: 12, padding: 16, gap: 4 },
  code: { textAlign: 'center', fontFamily: 'monospace', letterSpacing: 2 },
});
