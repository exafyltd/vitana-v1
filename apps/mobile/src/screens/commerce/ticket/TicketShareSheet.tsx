/**
 * VTID-05512 — copied from VTID-05511's twin (PR #1575, not on this lane's
 * base; deduplicated once both land): twin of `src/components/tickets/TicketShareSheet.tsx`, the
 * "Share your ticket" dialog: the ticket preview card (photo or ticket tile,
 * title, type • buyer, date, venue), "Quick share" with WhatsApp, Viber,
 * Email, SMS, Download and Copy Link, and the "opens your personal apps" note.
 *
 * The web first renders the pass to a PNG (html2canvas) and downloads it,
 * then opens the app with the share text. The native app has no view-capture
 * module (none in its dependencies; adding one is outside this lane's paths),
 * so each button sends the share text only: WhatsApp `wa.me`, Viber
 * `viber://forward` (if Viber is not installed the system share sheet takes
 * the text, where the web copied it to the clipboard), e-mail `mailto:`, SMS
 * `sms:`, and Download / Copy Link through the system share sheet (save,
 * copy). The web's "Ticket downloaded! …" toasts describe that PNG download,
 * so natively each action toasts what it did: "Opening …" or "Event details
 * copied!" after the share sheet completes.
 */
import { useState, type ReactElement } from 'react';
import { Image, Linking, Share, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../../ports/ui';
import { alpha, CheckoutIcon, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, notifySuccess, useTokenColor } from '../../../ports/commerce';
import { useI18n } from '../../../i18n/I18nProvider';

const K = 'discoverCommerceNative.commerce.ticketShare';

/** `shareText` (TicketShareSheet.tsx:52): going-to line, date, venue. */
export function ticketShareText(t: (k: string, p?: Record<string, string | number>) => string, eventTitle: string, eventDate?: string, eventLocation?: string): string {
  return `${t(`${K}.goingTo`, { title: eventTitle })}${eventDate ? `\n📅 ${eventDate}` : ''}${eventLocation ? `\n📍 ${eventLocation}` : ''}`;
}

export function TicketShareSheet({
  open,
  onOpenChange,
  eventTitle,
  ticketNumber,
  eventDate,
  eventLocation,
  eventImageUrl,
  ticketType,
  buyerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  ticketNumber: string;
  eventDate?: string;
  eventLocation?: string;
  eventImageUrl?: string;
  ticketType?: string;
  buyerName?: string;
}): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = { success: useTokenColor('status-success'), category2: useTokenColor('category-2') };
  const [copied, setCopied] = useState(false);
  const text = ticketShareText(t, eventTitle, eventDate, eventLocation);

  const open_ = (url: string, toastKey: string) => {
    notifySuccess(toastKey);
    void Linking.openURL(url).catch(() => undefined);
  };
  const shareSheet = async (onDone: () => void) => {
    try {
      const r = await Share.share({ title: eventTitle, message: `${text}\n#${ticketNumber}` });
      if (r.action === Share.sharedAction) onDone();
    } catch {
      /* cancelled */
    }
  };

  const buttons: Array<{ id: string; label: string; icon: ReactElement; onPress: () => void }> = [
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <Disc tint={palette.success}><CheckoutIcon name="MessageCircle" size={18} color={colors.primaryForeground} /></Disc>,
      onPress: () => open_(`https://wa.me/?text=${encodeURIComponent(text)}`, `${K}.openingWhatsapp`),
    },
    {
      id: 'viber',
      label: 'Viber',
      icon: <Disc tint={palette.category2}><CheckoutIcon name="Send" size={18} color={colors.primaryForeground} /></Disc>,
      onPress: () => {
        const url = `viber://forward?text=${encodeURIComponent(text)}`;
        void Linking.openURL(url)
          .then(() => notifySuccess(`${K}.openingViber`))
          .catch(() => void shareSheet(() => notifySuccess('toasts.tickets.eventDetailsCopied')));
      },
    },
    {
      id: 'email',
      label: t(`${K}.email`),
      icon: <Disc tint={colors.primary}><CheckoutIcon name="Mail" size={18} color={colors.primaryForeground} /></Disc>,
      onPress: () => open_(`mailto:?subject=${encodeURIComponent(t(`${K}.emailSubject`, { title: eventTitle }))}&body=${encodeURIComponent(text)}`, `${K}.openingEmail`),
    },
    {
      id: 'sms',
      label: t(`${K}.sms`),
      icon: <Disc tint={palette.success}><CheckoutIcon name="MessageSquare" size={18} color={colors.primaryForeground} /></Disc>,
      onPress: () => open_(`sms:?&body=${encodeURIComponent(text)}`, `${K}.openingMessages`),
    },
    {
      id: 'download',
      label: t('screens.tickets.download'),
      icon: <Disc tint={colors.secondary}><CheckoutIcon name="Download" size={18} color={colors.secondaryForeground} /></Disc>,
      onPress: () => void shareSheet(() => notifySuccess('toasts.tickets.ticketSaved')),
    },
    {
      id: 'copy',
      label: copied ? t(`${K}.copied`) : t(`${K}.copyLink`),
      icon: (
        <Disc tint={copied ? palette.success : colors.muted}>
          <CheckoutIcon name={copied ? 'Check' : 'Link2'} size={18} color={copied ? colors.primaryForeground : colors.mutedForeground} />
        </Disc>
      ),
      onPress: () =>
        void shareSheet(() => {
          setCopied(true);
          notifySuccess('toasts.tickets.eventDetailsCopied');
          setTimeout(() => setCopied(false), 2000);
        }),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="ticket-share-dialog">
        <DialogHeader>
          <DialogTitle>{t('screens.tickets.shareYourTicket')}</DialogTitle>
          <DialogDescription>{t('screens.tickets.sendYourTicketFriendsSaveFor')}</DialogDescription>
        </DialogHeader>
        <View style={[styles.preview, { backgroundColor: alpha(colors.muted, 0.3), borderColor: colors.border }]}>
          {eventImageUrl ? (
            <Image source={{ uri: eventImageUrl }} style={styles.thumb} accessibilityLabel={eventTitle} />
          ) : (
            <View style={[styles.thumb, styles.center, { backgroundColor: colors.muted }]}>
              <CheckoutIcon name="Ticket" size={24} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.flex}>
            <Text size="sm" weight="600" numberOfLines={1}>
              {eventTitle}
            </Text>
            {ticketType || buyerName ? (
              <Text size="xs" muted>
                {[ticketType, buyerName].filter(Boolean).join(' • ')}
              </Text>
            ) : null}
            {eventDate ? (
              <Text size="xs" muted>
                {eventDate}
              </Text>
            ) : null}
            {eventLocation ? (
              <Text size="xs" muted numberOfLines={1}>
                {eventLocation}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.section}>
          <Text size="xs" weight="500" muted>
            {t('screens.tickets.quickShare')}
          </Text>
          <View style={styles.grid}>
            {buttons.map((b) => (
              <Button key={b.id} variant="outline" style={styles.tile} onPress={b.onPress} testID={`ticket-share-${b.id}`}>
                {b.icon}
                <Text size="xs" weight="500">
                  {b.label}
                </Text>
              </Button>
            ))}
          </View>
        </View>
        <Text size="xs" muted style={styles.note}>
          {t('screens.tickets.opensYourPersonalAppsShareDirectly')}
        </Text>
      </DialogContent>
    </Dialog>
  );
}

function Disc({ tint, children }: { tint: string; children: ReactElement }): ReactElement {
  return <View style={[styles.disc, { backgroundColor: tint }]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  preview: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 8, borderWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', height: 'auto', paddingVertical: 12, flexDirection: 'column', gap: 8 },
  disc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  note: { textAlign: 'center' },
});
