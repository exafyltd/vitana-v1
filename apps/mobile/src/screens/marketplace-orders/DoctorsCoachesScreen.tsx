/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — native
 * port of `src/pages/discover/DoctorsCoaches.tsx`, the screen phones get
 * (`DoctorsCoachesLegacy`; Spotlight is desktop-only). Row
 * `DISCOVER.DOCTORS_COACHES` (`/discover/doctors-coaches`).
 *  - the Discover sub-navigation, the page gradient, the title;
 *  - the utility rail: Search (placeholder only — the web passes no
 *    `onSearch`), Calendar, "+ Action" (the Quick Book Actions dialog), then
 *    Life Compass and Gift Voucher (iOS-gated as today), trailing Refresh;
 *  - the three-way split bar: Find Providers · Best Matches · 💛 My Providers (N);
 *  - Find: the filter panel (Specialty, Location, Price Range, Availability,
 *    Rating — selects without an effect, as on the web) and the six provider
 *    cards (bookmark, avatar + verified tick, name, title, rating (reviews),
 *    badges, about, experience, price range, location, "Available …", View
 *    Profile → /discover/provider/:id, Book Now → the booking dialog);
 *  - Best Matches: "AI-matched Providers", the cards with the 94 % − 2·i match,
 *    "Perfect for your health goals", location, availability, Book Now;
 *  - My Providers: the Upcoming / Past Visits / Bookmarked counters and the
 *    Bookmarked · Upcoming (N) · History tabs (bookmarked provider cards with
 *    Book Now / Remove; appointment cards with the countdown badge, date,
 *    time – duration, location, Reschedule / Cancel / Add Notes; the visit
 *    history cards), each with its empty state;
 *  - the booking dialog (BookingPaymentFlow twin) — on completion the
 *    appointment row is inserted (`provider_appointments`, tomorrow, 30 min)
 *    and the upcoming list refreshes.
 * Buttons the web leaves without a handler (bookmarked "Book Now",
 * Reschedule / Cancel / Add Notes, Book Follow-up / View Details) do nothing
 * here either. The web's `AutopilotPopup` on this page is never opened (no
 * setter is called), so it has no native counterpart.
 */
import { useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, Text, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useCommercePalette } from '../../ports/marketplace-orders';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { MobileHeader, Panel, ScreenScroll } from './components';
import { formatDate } from './format';
import { BookingPaymentFlow } from './BookingPaymentFlow';
import { BookActionPopup, BookmarkButton, DiscoverSubNav, ProviderAvatar, VisitHistoryCard } from './providers';
import { CalendarButton, RefreshButton, SearchButton, UtilityBar } from './UtilityBar';
import { appointmentFor, bookingPrice, PROVIDERS, useBookmarks, useSaveAppointment, useUpcomingAppointments, useVisitHistory, type Appointment, type Provider } from './data/providers';
import { useWalletBalances } from './data/booking';

const D = 'screens.discover';
const K = 'discoverCommerceNative.marketplaceOrders';

const FILTERS: Array<{ placeholder: string; items: Array<[string, string]> }> = [
  { placeholder: `${D}.specialty`, items: [['all', `${D}.allSpecialties`], ['longevity', `${D}.longevityMedicine`], ['fitness', `${D}.fitnessMovement`], ['mental', `${D}.mentalWellness`], ['recovery', `${D}.recoveryTherapy`], ['nutrition', `${D}.nutrition`], ['sleep', `${D}.sleepMedicine`]] },
  { placeholder: `${D}.location`, items: [['all', `${D}.allLocations`], ['online', `${D}.online`], ['local', `${D}.nearMe`], ['travel', `${D}.travelAvailable`]] },
  { placeholder: `${D}.priceRange2`, items: [['all', `${D}.anyPrice`], ['0-100', '$0 - $100'], ['100-200', '$100 - $200'], ['200+', '$200+']] },
  { placeholder: `${D}.availability`, items: [['all', `${D}.anyTime`], ['today', `${D}.today`], ['week', `${D}.thisWeek`], ['month', `${D}.thisMonth`]] },
  { placeholder: `${D}.rating`, items: [['all', `${D}.anyRating`], ['4.5', `${D}.text45Stars`], ['4.0', `${D}.text40Stars`]] },
];

/** The booking dialog's booking for a provider (DoctorsCoaches.tsx:774-797). */
export function bookingFor(p: Provider, t: (k: string, params?: Record<string, string | number>) => string) {
  return {
    id: p.id.toString(),
    title: t(`${K}.booking.sessionTitle`, { title: t(p.titleKey) }),
    description: t(`${K}.booking.sessionDescription`, { name: p.name }),
    price: bookingPrice(p),
    provider: { name: p.name, avatar: p.image, rating: p.rating },
    duration: '30 min',
    location: p.location,
    type: 'service' as const,
  };
}

export function DoctorsCoachesScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const [tab, setTab] = useState('find');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [booking, setBooking] = useState<Provider | null>(null);
  const bookmarks = useBookmarks();
  const upcoming = useUpcomingAppointments().data ?? [];
  const history = useVisitHistory().data ?? [];
  const saveAppointment = useSaveAppointment();
  const { getBalance } = useWalletBalances();
  const savedProviders = bookmarks.getBookmarksByType('provider');

  const badgeStyle = (label: string) =>
    label === 'Top Rated'
      ? { bg: palette.successSubtle, fg: palette.success }
      : label === 'Trending'
        ? { bg: palette.warningSubtle, fg: palette.warning }
        : label === 'New'
          ? { bg: alpha(palette.category3, 0.15), fg: palette.category3 }
          : { bg: colors.muted, fg: colors.mutedForeground };

  const avatarWithTick = (p: Provider, size: number) => (
    <View>
      <ProviderAvatar name={p.name} image={p.image} size={size} />
      {p.badgeKeys.map((k) => t(k)).includes('Verified') ? (
        <View style={[styles.tick, { backgroundColor: palette.category3 }]} testID={`mo-verified-${p.id}`}>
          <CommerceIcon name="Verified" size={10} color={colors.primaryForeground} />
        </View>
      ) : null}
    </View>
  );

  const available = (p: Provider, size: 'xs' | 'sm' = 'sm') => (
    <View style={styles.row}>
      <CommerceIcon name="Clock" size={size === 'xs' ? 12 : 14} color={palette.success} />
      <Text size={size} color={palette.success}>
        {t(`${D}.availableNextavailable`, { nextAvailable: t(p.nextAvailableKey) })}
      </Text>
    </View>
  );
  const located = (p: Provider, size: 'xs' | 'sm' = 'sm') => (
    <View style={styles.row}>
      <CommerceIcon name="MapPin" size={size === 'xs' ? 12 : 14} color={colors.mutedForeground} />
      <Text size={size} muted>
        {p.location}
      </Text>
    </View>
  );
  const stars = (p: Provider) => (
    <View style={styles.row}>
      <CommerceIcon name="Star" size={12} color={palette.warning} fill={palette.warning} />
      <Text size="xs" weight="500">
        {String(p.rating)}
      </Text>
      <Text size="xs" muted>{`(${p.reviews})`}</Text>
    </View>
  );
  const bookmarkItem = (p: Provider, withPrice: boolean) => ({
    item_type: 'provider',
    item_id: p.id.toString(),
    item_name: p.name,
    item_image_url: p.image,
    item_metadata: withPrice ? { specialty: t(p.specialtyKey), rating: p.rating, location: p.location, priceRange: p.priceRange } : { specialty: t(p.specialtyKey), rating: p.rating, location: p.location },
  });

  return (
    <View style={styles.fill} testID="screen-doctors-coaches">
      <ScreenScroll>
        <DiscoverSubNav />
        <View style={[styles.page, { experimental_backgroundImage: palette.pageGradient }]}>
          <MobileHeader title={t(`${D}.doctorsCoaches`)} />
          <UtilityBar returnTo="/discover/doctors-coaches" trailing={<RefreshButton />}>
            <SearchButton placeholder={t(`${D}.searchDoctorsCoaches`)} testID="doctors-search" />
            <CalendarButton />
            <Button size="sm" onPress={() => setActionsOpen(true)} testID="doctors-action">
              <CommerceIcon name="Plus" size={16} color={colors.primaryForeground} />
              {t(`${D}.action`)}
            </Button>
          </UtilityBar>

          <Tabs value={tab} onValueChange={setTab} style={styles.gap24}>
            <TabsList style={styles.split}>
              <TabsTrigger value="find" style={styles.flex} testID="doctors-tab-find">
                {t(`${D}.findProviders`)}
              </TabsTrigger>
              <TabsTrigger value="matches" style={styles.flex} testID="doctors-tab-matches">
                {t(`${D}.bestMatches`)}
              </TabsTrigger>
              <TabsTrigger value="myproviders" style={styles.flex} testID="doctors-tab-mine">
                {t(`${D}.myProvidersValue0`, { value0: savedProviders.length > 0 ? `(${savedProviders.length})` : '' })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="find" style={styles.gap24}>
              <Panel style={styles.filters} testID="doctors-filters">
                {FILTERS.map((f) => (
                  <Select key={f.placeholder}>
                    <SelectTrigger style={styles.filter} testID={`doctors-filter-${f.placeholder.split('.').pop()}`}>
                      <SelectValue placeholder={t(f.placeholder)} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.items.map(([v, label]) => (
                        <SelectItem key={v} value={v}>
                          {label.startsWith('screens.') ? t(label) : label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}
              </Panel>
              <View style={styles.gap24} testID="doctors-list">
                {PROVIDERS.map((p) => (
                  <Panel key={p.id} style={styles.card} testID={`provider-card-${p.id}`}>
                    <BookmarkButton item={bookmarkItem(p, true)} bookmarked={bookmarks.isBookmarked('provider', p.id.toString())} onToggle={bookmarks.toggleBookmark} />
                    <View style={styles.head}>
                      {avatarWithTick(p, 48)}
                      <View style={styles.flex}>
                        <Text size="sm" weight="600">
                          {p.name}
                        </Text>
                        <Text size="xs" muted>
                          {t(p.titleKey)}
                        </Text>
                        {stars(p)}
                      </View>
                    </View>
                    <View style={styles.badges}>
                      {p.badgeKeys.map((k) => {
                        const label = t(k);
                        const s = badgeStyle(label);
                        return (
                          <View key={k} style={[styles.badge, { backgroundColor: s.bg }]}>
                            {label === 'Trending' ? <CommerceIcon name="TrendingUp" size={12} color={s.fg} /> : null}
                            {label === 'Top Rated' ? <CommerceIcon name="Award" size={12} color={s.fg} /> : null}
                            <Text size="xs" weight="600" color={s.fg}>
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text size="xs" muted numberOfLines={2}>
                      {t(p.aboutKey)}
                    </Text>
                    <View style={styles.gap4}>
                      <View style={styles.between}>
                        <Text size="xs" muted>
                          {t(`${D}.experience`)}
                        </Text>
                        <Text size="xs" weight="500">
                          {t(`${D}.providerExperience`, { years: p.years })}
                        </Text>
                      </View>
                      <View style={styles.between}>
                        <Text size="xs" muted>
                          {t(`${D}.priceRange`)}
                        </Text>
                        <Text size="xs" weight="500">
                          {p.priceRange}
                        </Text>
                      </View>
                      {located(p, 'xs')}
                      {available(p, 'xs')}
                    </View>
                    <View style={styles.row}>
                      <Button size="sm" style={styles.flex} onPress={() => navigateToWebPath(`/discover/provider/${p.id}`)} testID={`provider-view-${p.id}`}>
                        {t(`${D}.viewProfile`)}
                      </Button>
                      <Button size="sm" style={styles.flex} onPress={() => setBooking(p)} testID={`provider-book-${p.id}`}>
                        {t(`${D}.bookNow`)}
                      </Button>
                    </View>
                  </Panel>
                ))}
              </View>
            </TabsContent>

            <TabsContent value="matches">
              <Panel style={styles.card} testID="doctors-matches">
                <View style={styles.row}>
                  <CommerceIcon name="Brain" size={24} color={palette.category2} />
                  <Text size="2xl" weight="600" accessibilityRole="header">
                    {t(`${D}.aimatchedProviders`)}
                  </Text>
                </View>
                <Text muted>{t(`${D}.providersMatchedYourHealthNeedsPreferences`)}</Text>
                {PROVIDERS.slice(0, 6).map((p, index) => (
                  <View key={p.id} style={[styles.matchCard, { borderColor: alpha(palette.category2, 0.25), backgroundColor: colors.card }]} testID={`match-card-${p.id}`}>
                    <View style={styles.head}>
                      {avatarWithTick(p, 48)}
                      <View style={styles.flex}>
                        <View style={styles.between}>
                          <Text size="sm" weight="600">
                            {p.name}
                          </Text>
                          <View style={[styles.score, { backgroundColor: colors.card }]}>
                            <Text size="xs" weight="700" color={palette.category2}>{`${94 - index * 2}%`}</Text>
                          </View>
                        </View>
                        <Text size="xs" muted>
                          {t(p.titleKey)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.perfect, { backgroundColor: alpha(palette.category2, 0.1) }]}>
                      <CommerceIcon name="Sparkles" size={12} color={palette.category2} />
                      <Text size="xs" color={palette.category2}>
                        {t(`${D}.perfectForYourHealthGoals`)}
                      </Text>
                    </View>
                    {located(p, 'xs')}
                    {available(p, 'xs')}
                    <Button size="sm" onPress={() => setBooking(p)} testID={`match-book-${p.id}`}>
                      {t(`${D}.bookNow`)}
                    </Button>
                  </View>
                ))}
              </Panel>
            </TabsContent>

            <TabsContent value="myproviders" style={styles.gap24}>
              <View style={styles.stats}>
                <Stat value={upcoming.length} label={t(`${D}.upcoming`)} tint={palette.category3} testID="stat-upcoming" />
                <Stat value={history.length} label={t(`${D}.pastVisits`)} tint={palette.success} testID="stat-past" />
                <Stat value={savedProviders.length} label={t(`${D}.bookmarked`)} tint={palette.category2} testID="stat-bookmarked" />
              </View>
              <Tabs defaultValue="bookmarked" style={styles.gap16}>
                <TabsList style={styles.split}>
                  <TabsTrigger value="bookmarked" style={styles.flex} testID="mine-tab-bookmarked">
                    {t(`${D}.bookmarked`)}
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" style={styles.flex} testID="mine-tab-upcoming">
                    {t(`${D}.upcomingLength`, { length: upcoming.length })}
                  </TabsTrigger>
                  <TabsTrigger value="history" style={styles.flex} testID="mine-tab-history">
                    {t(`${D}.history`)}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="bookmarked" style={styles.gap16}>
                  {savedProviders.length === 0 ? (
                    <Empty emoji="💛" title={t(`${D}.noSavedProvidersYet`)} body={t(`${D}.saveYourFavoriteProvidersAccessThem`)} testID="mine-empty-bookmarked" />
                  ) : (
                    savedProviders.map((b) => {
                      const p = PROVIDERS.find((x) => x.id.toString() === b.item_id);
                      if (!p) return null;
                      return (
                        <Panel key={b.id} style={styles.card} testID={`saved-provider-${p.id}`}>
                          <BookmarkButton item={bookmarkItem(p, false)} bookmarked onToggle={bookmarks.toggleBookmark} />
                          <View style={styles.head}>
                            <ProviderAvatar name={p.name} image={p.image} size={64} />
                            <View style={styles.flex}>
                              <Text size="lg" weight="600" numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text size="sm" muted>
                                {t(p.titleKey)}
                              </Text>
                              {stars(p)}
                            </View>
                          </View>
                          {located(p)}
                          {available(p)}
                          <View style={styles.row}>
                            <Button size="sm" style={styles.flex}>
                              {t(`${D}.bookNow`)}
                            </Button>
                            <Button size="sm" variant="outline" onPress={() => void bookmarks.removeBookmark('provider', p.id.toString())} testID={`saved-remove-${p.id}`}>
                              {t(`${D}.remove`)}
                            </Button>
                          </View>
                        </Panel>
                      );
                    })
                  )}
                </TabsContent>
                <TabsContent value="upcoming" style={styles.gap16}>
                  {upcoming.length === 0 ? (
                    <Empty emoji="📅" title={t(`${D}.noUpcomingAppointments`)} body={t(`${D}.bookAppointmentWithProviderSeeIt`)} testID="mine-empty-upcoming" />
                  ) : (
                    upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} />)
                  )}
                </TabsContent>
                <TabsContent value="history" style={styles.gap16}>
                  {history.length === 0 ? (
                    <Empty emoji="📋" title={t(`${D}.noVisitHistoryYet`)} body={t(`${D}.yourCompletedAppointmentsWillAppearHere`)} testID="mine-empty-history" />
                  ) : (
                    history.map((v) => <VisitHistoryCard key={v.id} visit={v} />)
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </View>
      </ScreenScroll>

      <BookActionPopup open={actionsOpen} onOpenChange={setActionsOpen} />
      {booking ? (
        <BookingPaymentFlow
          isOpen
          onClose={() => setBooking(null)}
          booking={bookingFor(booking, t)}
          userBalance={{ credits: getBalance('CREDITS') || 0, usd: getBalance('USD') || 0 }}
          onBookingComplete={async () => {
            await saveAppointment(appointmentFor(booking, t));
            setBooking(null);
          }}
        />
      ) : null}
    </View>
  );
}

function Stat({ value, label, tint, testID }: { value: number; label: string; tint: string; testID: string }): ReactElement {
  return (
    <View style={[styles.stat, { backgroundColor: alpha(tint, 0.1), borderColor: alpha(tint, 0.2) }]} testID={testID}>
      <Text size="2xl" weight="700" color={tint}>
        {String(value)}
      </Text>
      <Text size="sm" muted style={styles.center}>
        {label}
      </Text>
    </View>
  );
}

function Empty({ emoji, title, body, testID }: { emoji: string; title: string; body: string; testID: string }): ReactElement {
  return (
    <Panel style={styles.empty} testID={testID}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text size="xl" weight="600" style={styles.center}>
        {title}
      </Text>
      <Text muted style={styles.center}>
        {body}
      </Text>
    </Panel>
  );
}

/** The upcoming-appointment card (DoctorsCoaches.tsx:665-725) with its countdown badge. */
function AppointmentCard({ appointment }: { appointment: Appointment }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const at = new Date(appointment.start_time);
  const ms = at.getTime() - Date.now();
  const daysUntil = Math.trunc(ms / 86_400_000);
  const hoursUntil = Math.trunc(ms / 3_600_000);
  let badge: ReactElement;
  if (daysUntil > 7) badge = <Badge variant="outline">{formatDate(at, 'MMM dd, yyyy', locale)}</Badge>;
  else if (daysUntil > 0) badge = <Tone bg={palette.category3} label={t(`${D}.daysuntilDaysAway`, { daysUntil })} />;
  else if (hoursUntil > 0) badge = <Tone bg={palette.warning} label={t(`${D}.todayHoursuntilHAway`, { hoursUntil })} />;
  else badge = <Tone bg={palette.error} label={t(`${D}.startingSoon`)} />;
  return (
    <Panel style={styles.card} testID={`appointment-${appointment.id}`}>
      <View style={styles.between}>
        <View style={styles.head}>
          <ProviderAvatar name={appointment.provider_name} image={appointment.provider_image_url || ''} size={64} />
          <View style={styles.gap4}>
            <Text size="lg" weight="600">
              {appointment.provider_name}
            </Text>
            <Text size="sm" muted>
              {appointment.provider_specialty}
            </Text>
            <View testID={`appointment-badge-${appointment.id}`}>{badge}</View>
          </View>
        </View>
        <Badge variant="outline">{appointment.appointment_type}</Badge>
      </View>
      <View style={styles.gap4}>
        <View style={styles.row}>
          <CommerceIcon name="Calendar" size={16} color={colors.foreground} />
          <Text size="sm">{formatDate(at, 'EEEE, MMMM dd, yyyy', locale)}</Text>
        </View>
        <View style={styles.row}>
          <CommerceIcon name="Clock" size={16} color={colors.foreground} />
          <Text size="sm">{t(`${D}.value0Duration_minutesMin`, { value0: formatDate(at, 'HH:mm', locale), duration_minutes: appointment.duration_minutes })}</Text>
        </View>
        {appointment.location ? (
          <View style={styles.row}>
            <CommerceIcon name="MapPin" size={16} color={colors.foreground} />
            <Text size="sm">{appointment.location}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <Button size="sm" variant="outline">
          {t(`${D}.reschedule`)}
        </Button>
        <Button size="sm" variant="outline">
          {t(`${D}.cancel`)}
        </Button>
        <Button size="sm" variant="outline">
          {t(`${D}.addNotes`)}
        </Button>
      </View>
    </Panel>
  );
}

function Tone({ bg, label }: { bg: string; label: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.tone, { backgroundColor: bg }]}>
      <Text size="xs" weight="600" color={colors.primaryForeground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  page: { padding: 24, gap: 24 },
  gap4: { gap: 4 },
  gap16: { gap: 16 },
  gap24: { gap: 24 },
  split: { flexDirection: 'row' },
  filters: { padding: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filter: { minWidth: 120 },
  card: { padding: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tick: { position: 'absolute', bottom: -4, end: -4, borderRadius: 999, padding: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  matchCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  score: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  perfect: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 8 },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
  center: { textAlign: 'center' },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emoji: { fontSize: 60, lineHeight: 72 },
  tone: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
