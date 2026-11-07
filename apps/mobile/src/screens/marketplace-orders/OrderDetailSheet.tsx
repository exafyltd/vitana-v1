/**
 * VTID-05511 — twin of `src/components/orders/MobileOrderDetailSheet.tsx`, the
 * bottom sheet an order card opens (90 % high, sticky header, scrolling body,
 * action bar pinned to the bottom):
 *  - header: the type tile (ticket / voucher / product / service tint), "Order
 *    Details", "<Type> • <date>", close (×);
 *  - summary card: image or emoji tile, title, subtitle, status badge, price;
 *  - Order Info: reference (ticket number), purchase date, event date,
 *    location, quantity (> 1);
 *  - Your ticket: the EventTicket twin (tickets with an event);
 *  - Gift Voucher: 🎁 and the code (vouchers);
 *  - the send-to-recipient form (vouchers): e-mail *, name, message, Cancel /
 *    Send → `voucher-send-email`;
 *  - the bottom bar: Download PDF (vouchers → `voucher-download-pdf`, then the
 *    signed PDF opens in the system browser — the web's anchor download; a
 *    ticket toasts "use the ticket view", anything else "not available") and
 *    "Send to Recipient" (vouchers, until the form is open).
 * The web's sonner `toast.loading` → `toast.success/error` pairs become the
 * kit's toasts (a "generating / sending" toast, then the outcome).
 */
import { useState, type ReactElement } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, BottomSheet, Button, Spinner, Text, TextInput, notify, notifyError, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, Label, notifySuccess, Textarea, useCommercePalette } from '../../ports/marketplace-orders';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from './format';
import { EventTicket } from './ticket/EventTicket';
import { downloadVoucherPdf, hasImage, sendVoucherEmail, statusVariant, type UnifiedMobileOrder } from './data/orders';

const K = 'discoverCommerceNative.marketplaceOrders.orders';
const TYPE_ICON: Record<string, string> = { ticket: 'Ticket', voucher: 'Gift', product: 'Package', service: 'Package' };
const TYPE_EMOJI: Record<string, string> = { ticket: '🎫', voucher: '🎁', product: '📦' };

export function OrderDetailSheet({ order, open, onOpenChange }: { order: UnifiedMobileOrder | null; open: boolean; onOpenChange: (open: boolean) => void }): ReactElement | null {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);

  if (!order) return null;

  const tone: Record<string, { bg: string; fg: string }> = {
    ticket: { bg: alpha(palette.category3, 0.15), fg: palette.category3 },
    voucher: { bg: alpha(palette.category2, 0.15), fg: palette.category2 },
    product: { bg: palette.successSubtle, fg: palette.success },
    service: { bg: palette.warningSubtle, fg: palette.warning },
  };
  const tint = tone[order.type] ?? tone.service;

  const handleDownloadPdf = async () => {
    if (order.type === 'voucher' && order.voucherOrder?.id) {
      notify('voucher.toast.generatingVoucher');
      setDownloading(true);
      try {
        const result = await downloadVoucherPdf(order.voucherOrder.id);
        if (!result?.voucher || !result?.signedPdfUrl) {
          notifyError('voucher.toast.failedToLoadVoucher');
          return;
        }
        await Linking.openURL(result.signedPdfUrl);
        notifySuccess('voucher.toast.downloadStarted');
      } catch {
        notifyError('voucher.toast.downloadFailed');
      } finally {
        setDownloading(false);
      }
    } else if (order.type === 'ticket' && order.ticketPurchase) {
      notify('voucher.toast.useTicketView');
    } else {
      notify('voucher.toast.pdfNotAvailable');
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      notifyError('voucher.toast.enterRecipientEmail');
      return;
    }
    if (order.type !== 'voucher' || !order.voucherOrder?.id) {
      notifyError('voucher.toast.emailOnlyForVouchers');
      return;
    }
    notify('voucher.toast.sendingVoucherEmail');
    setSending(true);
    try {
      await sendVoucherEmail({ orderId: order.voucherOrder.id, recipientEmail, recipientName, message: personalMessage });
      notifySuccess('voucher.toast.voucherSent', undefined, { email: recipientEmail });
      setShowEmailForm(false);
      setRecipientEmail('');
      setRecipientName('');
      setPersonalMessage('');
    } catch {
      notifyError('voucher.toast.downloadFailed');
    } finally {
      setSending(false);
    }
  };

  const infoRow = (icon: string, labelKey: string, value: string, mono = false, testID?: string) => (
    <View style={styles.infoRow} testID={testID}>
      <CommerceIcon name={icon} size={16} color={colors.mutedForeground} />
      <View>
        <Text size="xs" muted>
          {t(labelKey)}
        </Text>
        <Text size="sm" weight="500" style={mono ? styles.mono : undefined}>
          {value}
        </Text>
      </View>
    </View>
  );

  const sectionTitle = (key: string) => (
    <Text size="sm" weight="600" muted style={styles.caps}>
      {t(key)}
    </Text>
  );

  const card = [styles.card, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.border, 0.3) }];

  return (
    <BottomSheet open={open} onClose={() => onOpenChange(false)} testID="mo-order-sheet">
      <View style={styles.sheet}>
        <View style={[styles.header, { borderBottomColor: alpha(colors.border, 0.2) }]}>
          <View style={styles.row}>
            <View style={[styles.typeTile, { backgroundColor: tint.bg }]}>
              <CommerceIcon name={TYPE_ICON[order.type] ?? 'Package'} size={20} color={tint.fg} />
            </View>
            <View>
              <Text weight="600" accessibilityRole="header">
                {t('orders.detailSheet.title')}
              </Text>
              <Text size="xs" muted testID="mo-order-sheet-type">
                {`${t(`${K}.type.${order.type}`)} • ${order.orderDate}`}
              </Text>
            </View>
          </View>
          <Button variant="ghost" size="icon" accessibilityLabel={t('screens.common.close')} onPress={() => onOpenChange(false)} testID="mo-order-sheet-close">
            <CommerceIcon name="X" size={20} />
          </Button>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={card}>
            <View style={styles.row}>
              {hasImage(order.imageUrl) ? (
                <Image source={{ uri: order.imageUrl }} style={styles.thumb} accessibilityLabel={order.title} />
              ) : (
                <View style={[styles.thumb, styles.center, { backgroundColor: order.type === 'product' ? palette.successSubtle : tint.bg }]}>
                  <Text size="2xl">{TYPE_EMOJI[order.type] ?? '📦'}</Text>
                </View>
              )}
              <View style={styles.flex}>
                <Text weight="600" numberOfLines={2}>
                  {order.title}
                </Text>
                <Text size="sm" muted numberOfLines={1}>
                  {order.subtitle}
                </Text>
                <View style={[styles.row, styles.mt8]}>
                  <Badge variant={statusVariant(order.status)}>{order.statusLabel}</Badge>
                  <Text size="lg" weight="700">
                    {order.price}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[card, styles.gap12]}>
            {sectionTitle('orders.detailSheet.orderInfo')}
            {order.ticketNumber ? infoRow('Hash', 'orders.detailSheet.orderReference', order.ticketNumber, true, 'mo-order-reference') : null}
            {infoRow('Clock', 'orders.detailSheet.purchaseDate', order.orderDate)}
            {order.eventDate ? infoRow('Calendar', 'orders.detailSheet.eventDate', formatDate(order.eventDate, 'EEEE, MMMM d, yyyy • h:mm a', locale)) : null}
            {order.eventLocation ? infoRow('MapPin', 'orders.detailSheet.location', order.eventLocation) : null}
            {order.quantity && order.quantity > 1 ? infoRow('Ticket', 'orders.detailSheet.quantity', `${order.quantity} ${t('orders.detailSheet.tickets')}`) : null}
          </View>

          {order.type === 'ticket' && order.ticketPurchase?.event ? (
            <View style={[card, styles.gap12]} testID="mo-order-your-ticket">
              {sectionTitle('orders.detailSheet.yourTicket')}
              <EventTicket
                eventTitle={order.ticketPurchase.event.title}
                eventDate={new Date(order.ticketPurchase.event.start_time)}
                eventLocation={order.ticketPurchase.event.location || t(`${K}.locationTbd`)}
                ticketType={order.ticketPurchase.ticket_type?.name || t(`${K}.general`)}
                ticketNumber={order.ticketPurchase.ticket_number}
                buyerName={order.ticketPurchase.buyer_name}
                quantity={order.ticketPurchase.quantity}
                qrCodeData={order.ticketPurchase.qr_code_token}
                eventImageUrl={order.ticketPurchase.event.image_url || undefined}
              />
            </View>
          ) : null}

          {order.type === 'voucher' && order.voucherOrder ? (
            <View style={[styles.card, styles.voucher, { borderColor: alpha(palette.category2, 0.15), experimental_backgroundImage: `linear-gradient(135deg, ${alpha(palette.category2, 0.1)}, ${alpha(palette.category4, 0.1)})` }]} testID="mo-order-voucher">
              <Text size="2xl">🎁</Text>
              <Text size="lg" weight="600">
                {t('orders.detailSheet.giftVoucher')}
              </Text>
              {order.voucherOrder.voucher_code ? (
                <View style={[styles.code, { backgroundColor: alpha(colors.card, 0.8) }]}>
                  <Text size="xs" muted style={styles.caps}>
                    {t('orders.detailSheet.code')}
                  </Text>
                  <Text size="lg" weight="700" style={[styles.mono, styles.wide]} testID="mo-order-voucher-code">
                    {order.voucherOrder.voucher_code}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {showEmailForm && order.type === 'voucher' ? (
            <View style={[card, styles.gap12]} testID="mo-order-email-form">
              {sectionTitle('orders.detailSheet.sendToRecipient')}
              <Label>{t('orders.detailSheet.recipientEmail')}</Label>
              <TextInput testID="mo-order-email" keyboardType="email-address" autoCapitalize="none" placeholder={t('screens.orders.friendExampleCom')} value={recipientEmail} onChangeText={setRecipientEmail} />
              <Label>{t('orders.detailSheet.recipientName')}</Label>
              <TextInput testID="mo-order-name" placeholder={t('screens.orders.friendSName')} value={recipientName} onChangeText={setRecipientName} />
              <Label>{t('orders.detailSheet.personalMessage')}</Label>
              <Textarea testID="mo-order-message" placeholder={t('voucher.email.messagePlaceholder')} value={personalMessage} onChangeText={setPersonalMessage} numberOfLines={3} />
              <View style={styles.row}>
                <Button variant="outline" style={styles.flex} onPress={() => setShowEmailForm(false)} testID="mo-order-email-cancel">
                  {t('orders.detailSheet.cancel')}
                </Button>
                <Button style={styles.flex} onPress={() => void handleSendEmail()} disabled={sending || !recipientEmail} testID="mo-order-email-send">
                  {sending ? <Spinner /> : <CommerceIcon name="Send" size={16} color={colors.primaryForeground} />}
                  {sending ? '' : t('orders.detailSheet.send')}
                </Button>
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.actions, { backgroundColor: colors.background, borderTopColor: alpha(colors.border, 0.2) }]}>
          <Button variant="outline" style={styles.action} onPress={() => void handleDownloadPdf()} disabled={downloading} testID="mo-order-download">
            {downloading ? <Spinner /> : <CommerceIcon name="Download" size={16} />}
            {downloading ? '' : t('orders.detailSheet.downloadPdf')}
          </Button>
          {order.type === 'voucher' && !showEmailForm ? (
            <Button style={styles.action} onPress={() => setShowEmailForm(true)} testID="mo-order-send-recipient">
              <CommerceIcon name="Mail" size={16} color={colors.primaryForeground} />
              {t('orders.detailSheet.sendToRecipient')}
            </Button>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { maxHeight: 720 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { paddingVertical: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  gap12: { gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  mt8: { marginTop: 8, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mono: { fontVariant: ['tabular-nums'] },
  wide: { letterSpacing: 3 },
  caps: { textTransform: 'uppercase', letterSpacing: 1 },
  voucher: { alignItems: 'center', gap: 8 },
  code: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 16, paddingBottom: 8, borderTopWidth: 1 },
  action: { flex: 1, height: 48 },
});
