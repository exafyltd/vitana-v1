/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — native
 * port of `src/pages/MyTickets.tsx`, its phone branch (the non-Spotlight
 * return, :129-252). Row `DISCOVER.MY_TICKETS` (`/my-tickets`).
 *  - header band: the ticket icon disc, "My Tickets" and "N tickets purchased"
 *    (a skeleton bar while loading);
 *  - loading skeletons (`SpotlightLoading rows=3`); no tickets → the empty state
 *    (ticket icon, "No tickets yet", hint, "Browse Events" → /comm/events-meetups);
 *  - otherwise the Upcoming (N) / Past (N) tabs of ticket cards (event photo or
 *    ticket tile, title, date "EEE, MMM d • h:mm a" or "Date TBA", venue, the
 *    ticket-type pill, × quantity, "Checked In"; past ones dimmed), each with
 *    its own empty line;
 *  - a card opens the ticket dialog with the EventTicket twin (sequence 1).
 * The tickets are the web `useMyTickets` read (completed purchases with the
 * ticket type and the event). View only — no purchase control.
 */
import { useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, Dialog, DialogContent, useCommercePalette } from '../../ports/marketplace-orders';
import { useAuth } from '../../auth/AuthProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { PulseSkeletons, ScreenScroll } from './components';
import { formatDate, isPast } from './format';
import { EventTicket } from './ticket/EventTicket';
import { useMyTickets, type TicketPurchase } from './data/orders';

const K = 'discoverCommerceNative.marketplaceOrders.tickets';

export function MyTicketsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { user } = useAuth();
  const { data, isLoading } = useMyTickets(user?.id ?? null);
  const tickets = data ?? [];
  const [selected, setSelected] = useState<TicketPurchase | null>(null);
  const upcoming = tickets.filter((x) => x.event && !isPast(new Date(x.event.start_time)));
  const past = tickets.filter((x) => x.event && isPast(new Date(x.event.start_time)));

  return (
    <View style={styles.fill} testID="screen-my-tickets">
      <ScreenScroll>
        <View style={[styles.band, { experimental_backgroundImage: `linear-gradient(to bottom, ${alpha(colors.primary, 0.05)}, ${colors.background})` }]}>
          <View style={styles.row}>
            <View style={[styles.disc, { backgroundColor: alpha(colors.primary, 0.1) }]}>
              <CommerceIcon name="Ticket" size={24} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text size="2xl" weight="700" accessibilityRole="header">
                {t('screens.mytickets.myTickets')}
              </Text>
              {isLoading ? (
                <Skeleton style={styles.countSkeleton} />
              ) : (
                <Text muted testID="tickets-count">
                  {t('screens.mytickets.lengthTicketValue1Purchased', { length: tickets.length, value1: tickets.length !== 1 ? 's' : '' })}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {isLoading ? (
            <PulseSkeletons rows={3} testID="tickets-loading" />
          ) : tickets.length === 0 ? (
            <View style={styles.empty} testID="tickets-empty">
              <CommerceIcon name="Ticket" size={64} color={alpha(colors.mutedForeground, 0.3)} />
              <Text size="xl" weight="600" accessibilityRole="header">
                {t('screens.mytickets.noTicketsYet')}
              </Text>
              <Text muted style={styles.center}>
                {t('screens.mytickets.whenYouPurchaseEventTicketsThey')}
              </Text>
              <Button onPress={() => navigateToWebPath('/comm/events-meetups')} testID="tickets-browse-events">
                {t('screens.mytickets.browseEvents')}
              </Button>
            </View>
          ) : (
            <Tabs defaultValue="upcoming" style={styles.tabs}>
              <TabsList style={styles.tabList}>
                <TabsTrigger value="upcoming" style={styles.flex} testID="tickets-tab-upcoming">
                  {t('screens.mytickets.upcomingLength', { length: upcoming.length })}
                </TabsTrigger>
                <TabsTrigger value="past" style={styles.flex} testID="tickets-tab-past">
                  {t('screens.mytickets.pastLength', { length: past.length })}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" style={styles.list}>
                {upcoming.length === 0 ? (
                  <Text muted style={[styles.center, styles.none]} testID="tickets-none-upcoming">
                    {t('screens.mytickets.noUpcomingEvents')}
                  </Text>
                ) : (
                  upcoming.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => setSelected(ticket)} />)
                )}
              </TabsContent>
              <TabsContent value="past" style={styles.list}>
                {past.length === 0 ? (
                  <Text muted style={[styles.center, styles.none]} testID="tickets-none-past">
                    {t('screens.mytickets.noPastEvents')}
                  </Text>
                ) : (
                  past.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onPress={() => setSelected(ticket)} isPast />)
                )}
              </TabsContent>
            </Tabs>
          )}
        </View>
      </ScreenScroll>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent testID="tickets-dialog">
          {selected ? (
            <EventTicket
              ticketNumber={selected.ticket_number}
              eventTitle={selected.event?.title || t(`${K}.event`)}
              eventDate={new Date(selected.event?.start_time || Date.now())}
              eventLocation={selected.event?.location || ''}
              eventImageUrl={selected.event?.image_url || undefined}
              ticketType={selected.ticket_type?.name || t('spotlightMember.tickets.generalAdmission')}
              buyerName={selected.buyer_name}
              quantity={selected.quantity}
              qrCodeData={selected.qr_code_token}
              sequence={1}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </View>
  );
}

function TicketCard({ ticket, onPress, isPast: past }: { ticket: TicketPurchase; onPress: () => void; isPast?: boolean }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const event = ticket.event;
  return (
    <Pressable
      testID={`ticket-card-${ticket.id}`}
      accessibilityRole="button"
      accessibilityLabel={event?.title || t(`${K}.event`)}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, past ? styles.dim : null]}
    >
      <View style={[styles.photo, { backgroundColor: colors.muted }]}>
        {event?.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.photoImg} accessibilityIgnoresInvertColors />
        ) : (
          <CommerceIcon name="Ticket" size={32} color={alpha(colors.mutedForeground, 0.3)} />
        )}
      </View>
      <View style={styles.details}>
        <Text weight="600" numberOfLines={1}>
          {event?.title || t(`${K}.event`)}
        </Text>
        <View style={styles.meta}>
          <CommerceIcon name="Calendar" size={14} color={colors.mutedForeground} />
          <Text size="sm" muted>
            {event?.start_time ? formatDate(new Date(event.start_time), 'EEE, MMM d • h:mm a', locale) : t(`${K}.dateTba`)}
          </Text>
        </View>
        {event?.location ? (
          <View style={styles.meta}>
            <CommerceIcon name="MapPin" size={14} color={colors.mutedForeground} />
            <Text size="sm" muted numberOfLines={1} style={styles.flex}>
              {event.location}
            </Text>
          </View>
        ) : null}
        <View style={[styles.meta, styles.pt4]}>
          <View style={[styles.pill, { backgroundColor: alpha(colors.primary, 0.1) }]}>
            <Text size="xs" weight="500" color={colors.primary}>
              {ticket.ticket_type?.name || t(`${K}.general`)}
            </Text>
          </View>
          {ticket.quantity > 1 ? (
            <Text size="xs" muted>
              {`× ${ticket.quantity}`}
            </Text>
          ) : null}
          {ticket.checked_in_at ? (
            <View style={[styles.pill, { backgroundColor: alpha(palette.success, 0.1) }]} testID={`ticket-checked-${ticket.id}`}>
              <Text size="xs" weight="500" color={palette.success}>
                {t('screens.mytickets.checked')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <CommerceIcon name="ChevronRight" size={20} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  band: { paddingVertical: 32, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disc: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  countSkeleton: { height: 24, width: 160 },
  content: { paddingHorizontal: 16, paddingVertical: 24 },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 16 },
  center: { textAlign: 'center' },
  none: { paddingVertical: 48 },
  tabs: { gap: 24 },
  tabList: { flexDirection: 'row' },
  list: { gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderRadius: 12, padding: 16 },
  dim: { opacity: 0.7 },
  photo: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoImg: { width: '100%', height: '100%' },
  details: { flex: 1, minWidth: 0, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pt4: { paddingTop: 4, gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
