/**
 * VTID-05511 — twin of `src/components/tickets/EventTicket.tsx`, the event
 * pass the order sheet and My Tickets show (the `vitana` tenant config, the
 * one every caller here uses):
 *  - the pass: the event photo full-bleed (muted, scaled) or the tenant
 *    gradient, the dark top / bottom scrims and vignette; header with the
 *    brand + "EVENT PASS", the accent underline and the micro-text, the ticket
 *    type badge; the title; Date / Time / Venue; the boarding-pass divider with
 *    the two cut-outs; Attendee / Qty on the dark backing; the QR (level H,
 *    140 px, white tile) with "Scan for Entry"; the footer (ticket number,
 *    SEQ, the decorative barcode, the tenant serial `VTN-<code>-yyyyMMdd-NNNNN`,
 *    "Powered by VITANA"); the holographic seal;
 *  - Download and Share. The web Download renders the pass to a PNG with
 *    html2canvas; the native app has no view-capture module (none in its
 *    dependencies; a new one is outside this lane's paths), so Download hands
 *    the ticket's details to the system share sheet (save / send). Share opens
 *    the TicketShareSheet twin.
 * The pass is printed over the event photo, so like the web (its
 * `design-allow` scrim notes) it is theme-independent: white text and black
 * scrims, here the dark scheme's foreground / background tokens.
 */
import { useState, type ReactElement } from 'react';
import { Image, Platform, Share, StyleSheet, View } from 'react-native';
import { Button, Text } from '../../../ports/ui';
import { alpha, CommerceIcon, tokenColor } from '../../../ports/marketplace-orders';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatDate } from '../format';
import { QrCode } from './QrCode';
import { TicketShareSheet, ticketShareText } from './TicketShareSheet';

/** `TICKET_TENANT_CONFIG.vitana` (EventTicket.tsx:30-43): brand data, not theme colours. */
const VITANA_PASS = {
  brandName: 'VITANA',
  passLabel: 'EVENT PASS',
  accentColor: '#E8CFAF',
  tenantCode: 'VTN',
  hologram: { primary: 'VITANA', secondary: 'AUTHENTIC' },
  microText: 'OFFICIAL • VERIFIED • SECURE',
  footerText: 'Powered by VITANA',
  /** from-slate-700 via-slate-800 to-zinc-900 */
  gradient: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #18181b 100%)',
};

const MONO = Platform.select({ ios: 'Courier', default: 'monospace' });

const BARCODE = [3, 5, 2, 6, 4, 2, 5, 3, 6, 2, 4, 5, 3, 2, 6, 4];

export interface EventTicketProps {
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventImageUrl?: string;
  ticketType: string;
  buyerName: string;
  quantity: number;
  qrCodeData: string;
  sequence?: number;
}

/** The tenant serial (EventTicket.tsx:126). */
export function ticketSerial(eventDate: Date, sequence: number): string {
  return `VTN-${VITANA_PASS.tenantCode}-${formatDate(eventDate, 'yyyyMMdd', 'en')}-${String(sequence).padStart(5, '0')}`;
}

export function EventTicket({ ticketNumber, eventTitle, eventDate, eventLocation, eventImageUrl, ticketType, buyerName, quantity, qrCodeData, sequence = 1 }: EventTicketProps): ReactElement {
  const { t, locale } = useI18n();
  const [shareOpen, setShareOpen] = useState(false);
  const white = tokenColor('foreground', 'dark');
  const black = tokenColor('background', 'dark');
  const on = (a: number) => alpha(white, a);
  const shade = (a: number) => alpha(black, a);
  const accent = VITANA_PASS.accentColor;
  const dateLong = formatDate(eventDate, "EEE, MMM d, yyyy 'at' h:mm a", locale);

  const label = (s: string) => (
    <Text color={on(0.6)} weight="500" style={styles.label}>
      {s}
    </Text>
  );

  return (
    <View style={styles.wrap} testID="mo-event-ticket">
      <View style={[styles.pass, { backgroundColor: black }]}>
        {eventImageUrl ? (
          <Image source={{ uri: eventImageUrl }} style={[StyleSheet.absoluteFill, styles.photo]} resizeMode="cover" accessibilityLabel={eventTitle} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: VITANA_PASS.gradient }]} />
        )}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: shade(0.2) }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { experimental_backgroundImage: `radial-gradient(ellipse at center, transparent 40%, ${shade(0.4)} 100%)` }]} />
        <View pointerEvents="none" style={[styles.topScrim, { experimental_backgroundImage: `linear-gradient(to bottom, ${shade(0.7)} 0%, ${shade(0.55)} 50%, transparent 100%)` }]} />
        <View pointerEvents="none" style={[styles.bottomScrim, { experimental_backgroundImage: `linear-gradient(to bottom, ${shade(0.08)} 0%, ${shade(0.38)} 100%)` }]} />

        <View pointerEvents="none" style={styles.seal}>
          <View style={[StyleSheet.absoluteFill, styles.round, { opacity: 0.4, experimental_backgroundImage: `conic-gradient(from 0deg, ${alpha(accent, 0.13)}, ${alpha(accent, 0.38)}, ${alpha(accent, 0.19)}, ${alpha(accent, 0.13)})` }]} />
          <View style={[styles.sealInner, { borderColor: alpha(accent, 0.25) }]}>
            <Text color={on(0.5)} weight="700" style={styles.sealPrimary}>
              {VITANA_PASS.hologram.primary}
            </Text>
            <Text color={on(0.3)} style={styles.sealSecondary}>
              {VITANA_PASS.hologram.secondary}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.head, { borderBottomColor: on(0.3) }]}>
            <View>
              <View style={styles.row}>
                <Text size="sm" weight="700" color={white}>
                  {VITANA_PASS.brandName}
                </Text>
                <Text size="xs" weight="500" color={on(0.7)} style={styles.wide}>
                  {VITANA_PASS.passLabel}
                </Text>
              </View>
              <View style={[styles.underline, { backgroundColor: accent }]} />
              <Text color={on(0.3)} weight="500" style={styles.micro}>
                {VITANA_PASS.microText}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: on(0.9) }]}>
              <Text weight="600" color={black} style={styles.typeText} testID="mo-ticket-type">
                {ticketType.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text size="2xl" weight="700" color={white} style={styles.title} testID="mo-ticket-title">
            {eventTitle}
          </Text>

          <View style={styles.grid}>
            <View style={styles.cell}>
              {label(t('screens.tickets.date'))}
              <Text size="sm" weight="600" color={white}>
                {formatDate(eventDate, 'EEE, MMM d, yyyy', locale)}
              </Text>
            </View>
            <View style={styles.cell}>
              {label(t('screens.tickets.time'))}
              <Text size="sm" weight="600" color={white}>
                {formatDate(eventDate, 'h:mm a', locale)}
              </Text>
            </View>
          </View>
          <View style={styles.block}>
            {label(t('screens.tickets.venue'))}
            <Text size="sm" weight="600" color={white}>
              {eventLocation || t('discoverCommerceNative.marketplaceOrders.ticket.tba')}
            </Text>
          </View>

          <View style={styles.divider}>
            <View style={[styles.cut, styles.cutStart, { backgroundColor: shade(0.8) }]} />
            <View style={[styles.dash, { borderColor: on(0.4) }]} />
            <View style={[styles.cut, styles.cutEnd, { backgroundColor: shade(0.8) }]} />
          </View>

          <View style={[styles.attendee, { backgroundColor: shade(0.3) }]}>
            <View>
              {label(t('screens.tickets.attendee'))}
              <Text weight="700" color={white} style={styles.upper}>
                {buyerName}
              </Text>
            </View>
            <View style={styles.endAlign}>
              {label(t('screens.tickets.qty'))}
              <Text size="xl" weight="700" color={white}>
                {String(quantity)}
              </Text>
            </View>
          </View>

          <View style={styles.qrBlock}>
            <View style={[styles.qrTile, { backgroundColor: white }]}>
              <QrCode value={qrCodeData} size={140} fg={black} bg={white} />
            </View>
            <Text weight="600" color={on(0.8)} style={styles.label}>
              {t('screens.tickets.scanForEntry')}
            </Text>
          </View>

          <View style={[styles.footer, { borderTopColor: on(0.2) }]}>
            <View style={styles.between}>
              <Text color={on(0.6)} style={styles.mono} testID="mo-ticket-number">
                {ticketNumber}
              </Text>
              <Text color={on(0.6)} style={styles.mono}>
                {t('screens.tickets.seqValue0', { value0: String(sequence).padStart(4, '0') })}
              </Text>
            </View>
            <View style={styles.between}>
              <View style={styles.barcode}>
                {BARCODE.map((h, i) => (
                  <View key={i} style={{ width: 2, height: h * 2, borderRadius: 1, backgroundColor: white }} />
                ))}
              </View>
              <Text color={on(0.4)} style={styles.serial} testID="mo-ticket-serial">
                {ticketSerial(eventDate, sequence)}
              </Text>
            </View>
            <Text color={on(0.5)} weight="500" style={styles.powered}>
              {VITANA_PASS.footerText}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          variant="outline"
          style={styles.flex}
          testID="mo-ticket-download"
          onPress={() => void Share.share({ title: eventTitle, message: `${ticketShareText(t, eventTitle, dateLong, eventLocation)}\n#${ticketNumber}` }).catch(() => undefined)}
        >
          <CommerceIcon name="Download" size={16} />
          {t('screens.tickets.download')}
        </Button>
        <Button style={styles.flex} testID="mo-ticket-share" onPress={() => setShareOpen(true)}>
          <CommerceIcon name="Share2" size={16} color={white} />
          {t('screens.tickets.share')}
        </Button>
      </View>

      <TicketShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        eventTitle={eventTitle}
        ticketNumber={ticketNumber}
        eventDate={dateLong}
        eventLocation={eventLocation}
        eventImageUrl={eventImageUrl}
        ticketType={ticketType}
        buyerName={buyerName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  flex: { flex: 1 },
  pass: { width: '100%', minHeight: 440, borderRadius: 16, overflow: 'hidden' },
  photo: { opacity: 0.85, transform: [{ scale: 1.15 }] },
  topScrim: { position: 'absolute', top: 0, start: 0, end: 0, height: '52%' },
  bottomScrim: { position: 'absolute', bottom: 0, start: 0, end: 0, height: '48%' },
  seal: { position: 'absolute', bottom: 96, end: 16, width: 64, height: 64, zIndex: 10 },
  round: { borderRadius: 32 },
  sealInner: { position: 'absolute', top: 4, bottom: 4, start: 4, end: 4, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sealPrimary: { fontSize: 6, letterSpacing: 2 },
  sealSecondary: { fontSize: 4, letterSpacing: 1, marginTop: 2 },
  content: { padding: 16, zIndex: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wide: { letterSpacing: 2 },
  underline: { height: 2, width: 56, marginTop: 4, borderRadius: 1 },
  micro: { fontSize: 7, letterSpacing: 2, marginTop: 4 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  typeText: { fontSize: 10, letterSpacing: 0.5 },
  title: { marginVertical: 12, lineHeight: 30 },
  grid: { flexDirection: 'row', gap: 24, marginBottom: 12 },
  cell: { flex: 1, gap: 2 },
  block: { marginBottom: 12, gap: 2 },
  label: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  cut: { position: 'absolute', width: 20, height: 20, borderRadius: 10 },
  cutStart: { start: -26 },
  cutEnd: { end: -26 },
  dash: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed' },
  attendee: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginVertical: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  upper: { textTransform: 'uppercase', letterSpacing: 0.5 },
  endAlign: { alignItems: 'flex-end' },
  qrBlock: { alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  qrTile: { padding: 12, borderRadius: 16 },
  footer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mono: { fontSize: 10, fontFamily: MONO },
  barcode: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 12, opacity: 0.3 },
  serial: { fontSize: 8, letterSpacing: 1, fontFamily: MONO },
  powered: { fontSize: 9, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12 },
});
