/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/tickets/success` (exclusion row), twin of src/pages/TicketPurchaseSuccess.tsx
 * on a phone (`inApp` = Spotlight && signed in, and Spotlight is desktop-only,
 * so the page branches):
 *
 *  - no `?purchase_id` (:74-104): "Invalid request", "No purchase information
 *    found.", Browse events → /comm/events-meetups;
 *  - loading or verifying (:109-130): the detail skeleton + "Confirming your
 *    purchase…"; with `?session_id` the pending purchase is marked completed
 *    1.5 s after landing (data/purchases.ts, the web's own update);
 *  - error / no purchase (:132-163): "Something went wrong", the error (or the
 *    fallback line), View my tickets → /my-tickets;
 *  - success (:165-252): the success header (check disc, "Payment
 *    successful!", "…confirmation email sent to <email>"), the EventTicket pass
 *    (title or "Event", date, venue, "General Admission" fallback, buyer, qty,
 *    the QR of `qr_code_token`, Download / Share), View all my tickets ·
 *    Discover more events.
 *
 * iOS IAP gate flag (R5): the confirmation of a ticket purchase (the purchase
 * itself is on the web / Stripe). Today's behaviour, no iOS gate; drawer.ts
 * `iapRestricted` unchanged.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, CheckoutIcon } from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { TICKET_VERIFY_DELAY_MS, useTicketPurchase, verifyTicketPayment } from './data/purchases';
import { PulseBlock } from './parts';
import { EventTicket } from './ticket/EventTicket';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;

export function TicketPurchaseSuccessScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const params = useLocalSearchParams<{ purchase_id?: string; session_id?: string }>();
  const purchaseId = one(params.purchase_id);
  const sessionId = one(params.session_id);
  const { purchase, loading, error } = useTicketPurchase(purchaseId || '');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    if (!purchaseId || !sessionId) {
      setVerifying(false);
      return;
    }
    const timer = setTimeout(() => {
      void verifyTicketPayment(purchaseId, sessionId).finally(() => setVerifying(false));
    }, TICKET_VERIFY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [purchaseId, sessionId]);

  if (!purchaseId) {
    return (
      <View style={styles.centerPage} testID="ticket-invalid">
        <CheckoutIcon name="AlertCircle" size={64} color={colors.destructive} />
        <Text size="2xl" weight="700" accessibilityRole="header" style={styles.center}>
          {t('screens.ticketpurchasesuccess.invalidRequest')}
        </Text>
        <Text muted style={styles.center}>
          {t('screens.ticketpurchasesuccess.noPurchaseInformationFound')}
        </Text>
        <Button onPress={() => navigateToWebPath('/comm/events-meetups')} testID="ticket-browse-events">
          {t('screens.ticketpurchasesuccess.browseEvents')}
        </Button>
      </View>
    );
  }

  if (loading || verifying) {
    return (
      <View style={styles.loadingPage} testID="ticket-confirming">
        <PulseBlock height={220} radius={16} />
        <PulseBlock height={24} width="60%" />
        <PulseBlock height={16} width="80%" />
        <Text muted style={styles.center}>
          {t('screens.ticketpurchasesuccess.confirmingYourPurchase')}
        </Text>
      </View>
    );
  }

  if (error || !purchase) {
    return (
      <View style={styles.centerPage} testID="ticket-error">
        <CheckoutIcon name="AlertCircle" size={64} color={colors.destructive} />
        <Text size="2xl" weight="700" accessibilityRole="header" style={styles.center}>
          {t('screens.ticketpurchasesuccess.somethingWentWrong')}
        </Text>
        <Text muted style={styles.center} testID="ticket-error-message">
          {error || t('discoverCommerceNative.commerce.ticket.loadError')}
        </Text>
        <Button onPress={() => navigateToWebPath('/my-tickets')} testID="ticket-view-my-tickets">
          {t('screens.ticketpurchasesuccess.viewMyTickets')}
        </Button>
      </View>
    );
  }

  const event = purchase.event;
  const message = t('screens.ticketpurchasesuccess.yourTicketHasConfirmedConfirmationEmail', { value0: '\u0000' });
  const [head, after = ''] = message.split('\u0000');
  // The web appends the address after the sentence (value0 = " "); natively it
  // sits where the catalog puts {value0}, with the web's separating space.
  const before = /\s$/.test(head) ? head : `${head} `;
  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="ticket-success">
      <View style={[styles.header, { experimental_backgroundImage: `linear-gradient(to bottom, ${alpha(colors.primary, 0.1)} 0%, ${colors.background} 100%)` }]}>
        <View style={[styles.check, { backgroundColor: alpha(colors.statusSuccess, 0.2) }]}>
          <CheckoutIcon name="CheckCircle" size={32} color={colors.statusSuccess} />
        </View>
        <Text size="2xl" weight="700" accessibilityRole="header" style={styles.center}>
          {t('screens.ticketpurchasesuccess.paymentSuccessful')}
        </Text>
        <Text muted style={styles.center} testID="ticket-confirmation">
          {before}
          <Text weight="500">{purchase.buyer_email}</Text>
          {after}
        </Text>
      </View>
      <View style={styles.ticket}>
        <EventTicket
          ticketNumber={purchase.ticket_number}
          eventTitle={event?.title || t('discoverCommerceNative.commerce.ticket.eventFallback')}
          eventDate={new Date(event?.start_time || Date.now())}
          eventLocation={event?.location || ''}
          eventImageUrl={event?.image_url || undefined}
          ticketType={purchase.ticket_type?.name || t('discoverCommerceNative.commerce.ticket.generalAdmission')}
          buyerName={purchase.buyer_name}
          quantity={purchase.quantity}
          qrCodeData={purchase.qr_code_token}
          sequence={1}
        />
      </View>
      <View style={styles.actions}>
        <Button variant="outline" onPress={() => navigateToWebPath('/my-tickets')} style={styles.full} testID="ticket-view-all">
          <CheckoutIcon name="Calendar" size={16} color={colors.foreground} />
          {t('screens.ticketpurchasesuccess.viewAllMyTickets')}
        </Button>
        <Button onPress={() => navigateToWebPath('/comm/events-meetups')} style={styles.full} testID="ticket-discover-events">
          {t('screens.ticketpurchasesuccess.discoverMoreEvents')}
          <CheckoutIcon name="ArrowRight" size={16} color={colors.primaryForeground} />
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerPage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 },
  loadingPage: { padding: 16, paddingVertical: 32, gap: 16 },
  center: { textAlign: 'center' },
  scroll: { paddingBottom: 48 },
  header: { paddingVertical: 48, paddingHorizontal: 16, alignItems: 'center', gap: 16 },
  check: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  ticket: { paddingHorizontal: 16, paddingVertical: 32, marginTop: -16 },
  actions: { paddingHorizontal: 16, gap: 16 },
  full: { alignSelf: 'stretch' },
});
