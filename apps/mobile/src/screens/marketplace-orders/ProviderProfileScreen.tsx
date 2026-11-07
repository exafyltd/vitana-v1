/**
 * VTID-05511 (native-wave2-discover-commerce-r2/marketplace-orders) — native
 * port of `src/pages/discover/ProviderProfile.tsx`, the page phones get (the
 * non-Spotlight return). Row `DISCOVER.PROVIDER_PROFILE` (`/discover/provider/:id`).
 *  - unknown id: "Provider not found" + "Back to providers" (→ /discover/doctors-coaches);
 *  - "← Back" (history back; a cold-started deep link has no history, so it
 *    goes to the directory);
 *  - the profile card: avatar (128) with the verified tick and the bookmark,
 *    name, title, the badges (Top Rated with the award, Verified with the
 *    tick), rating + "(N reviews)", "N bookings", Book Appointment (→ the
 *    booking dialog), Message (no handler on the web), Share (the system share
 *    sheet with the profile link, the web's `shareOrCopy`);
 *  - the three quick-info cards: Location, Next Available, Experience;
 *  - the About · Services · Reviews · Availability tabs as on the web;
 *  - the booking dialog; on completion the appointment row is inserted.
 * The web counts the bookings with `fmtDateTime(n)` (a date formatter, which
 * prints a 1970 date for a count) — a web defect not reproduced: the count is
 * shown as a grouped number.
 */
import { useState, type ReactElement } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger, Text, notifyError, useUITheme } from '../../ports/ui';
import { CommerceIcon, useCommercePalette } from '../../ports/marketplace-orders';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { Panel, ScreenScroll } from './components';
import { formatCount } from './format';
import { BookingPaymentFlow } from './BookingPaymentFlow';
import { bookingFor } from './DoctorsCoachesScreen';
import { publicOrigin } from './IntentShareSheet';
import { BookmarkButton, ProviderAvatar } from './providers';
import { appointmentFor, findProfileProvider, useBookmarks, useSaveAppointment } from './data/providers';
import { useWalletBalances } from './data/booking';

const D = 'screens.discover';
const DIRECTORY = '/discover/doctors-coaches';

export function ProviderProfileScreen(): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const provider = findProfileProvider(typeof id === 'string' ? id : undefined);
  const [bookingOpen, setBookingOpen] = useState(false);
  const bookmarks = useBookmarks();
  const saveAppointment = useSaveAppointment();
  const { getBalance } = useWalletBalances();

  if (!provider) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]} testID="provider-not-found">
        <Text size="2xl" weight="700" accessibilityRole="header">
          {t(`${D}.providerNotFound`)}
        </Text>
        <Button onPress={() => navigateToWebPath(DIRECTORY)} testID="provider-back-directory">
          {t(`${D}.backProviders`)}
        </Button>
      </View>
    );
  }

  const badges = provider.badgeKeys.map((k) => t(k));
  const share = async () => {
    const url = `${publicOrigin()}/discover/provider/${encodeURIComponent(String(provider.id))}`;
    try {
      await Share.share({ title: provider.name, message: url, url });
    } catch {
      notifyError('toasts.common.couldnTCopyPleaseCopyLink');
    }
  };
  const back = () => {
    if (router.canGoBack()) router.back();
    else navigateToWebPath(DIRECTORY);
  };

  const quick = (icon: string, tint: string, labelKey: string, value: string, valueColor?: string) => (
    <Panel style={styles.quick}>
      <CommerceIcon name={icon} size={20} color={tint} />
      <View>
        <Text size="sm" muted>
          {t(labelKey)}
        </Text>
        <Text weight="500" color={valueColor}>
          {value}
        </Text>
      </View>
    </Panel>
  );

  return (
    <View style={styles.fill} testID="screen-provider-profile">
      <ScreenScroll>
        <View style={styles.page}>
          <Button variant="ghost" onPress={back} style={styles.back} testID="provider-back">
            <CommerceIcon name="ArrowLeft" size={16} />
            {t(`${D}.back`)}
          </Button>

          <Panel style={styles.profile} testID="provider-card">
            <View style={styles.photo}>
              <ProviderAvatar name={provider.name} image={provider.image} size={128} />
              {badges.includes('Verified') ? (
                <View style={[styles.tick, { backgroundColor: colors.primary }]} testID="provider-verified">
                  <CommerceIcon name="Verified" size={24} color={colors.primaryForeground} />
                </View>
              ) : null}
              <BookmarkButton
                item={{ item_type: 'provider', item_id: provider.id.toString(), item_name: provider.name, item_image_url: provider.image, item_metadata: { specialty: t(provider.specialtyKey), rating: provider.rating, location: provider.location } }}
                bookmarked={bookmarks.isBookmarked('provider', provider.id.toString())}
                onToggle={bookmarks.toggleBookmark}
              />
            </View>
            <Text size="2xl" weight="700" accessibilityRole="header" testID="provider-name">
              {provider.name}
            </Text>
            <Text size="xl" muted>
              {t(provider.titleKey)}
            </Text>
            <View style={styles.badges}>
              {badges.map((b) => (
                <Badge key={b} variant={b === 'Top Rated' ? 'default' : 'secondary'}>
                  {b === 'Top Rated' ? <CommerceIcon name="Award" size={16} color={colors.primaryForeground} /> : null}
                  {b === 'Verified' ? <CommerceIcon name="Verified" size={16} color={colors.secondaryForeground} /> : null}
                  <Text size="xs" weight="600" color={b === 'Top Rated' ? colors.primaryForeground : colors.secondaryForeground}>
                    {b}
                  </Text>
                </Badge>
              ))}
            </View>
            <View style={styles.rowWrap}>
              <View style={styles.row}>
                <CommerceIcon name="Star" size={20} color={palette.warning} fill={palette.warning} />
                <Text size="lg" weight="700">
                  {String(provider.rating)}
                </Text>
                <Text muted>{t(`${D}.reviewsReviews`, { reviews: provider.reviews })}</Text>
              </View>
              <View style={styles.row}>
                <CommerceIcon name="Users" size={16} color={colors.mutedForeground} />
                <Text muted testID="provider-bookings">
                  {t(`${D}.value0Bookings`, { value0: formatCount(provider.bookings, locale) })}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Button size="lg" style={styles.flex} onPress={() => setBookingOpen(true)} testID="provider-book">
                <CommerceIcon name="Calendar" size={16} color={colors.primaryForeground} />
                {t(`${D}.bookAppointment`)}
              </Button>
              <Button size="lg" variant="outline" testID="provider-message">
                <CommerceIcon name="MessageCircle" size={16} />
                {t(`${D}.message`)}
              </Button>
              <Button size="lg" variant="outline" accessibilityLabel={t('screens.profile.share')} onPress={() => void share()} testID="provider-share">
                <CommerceIcon name="Share2" size={16} />
              </Button>
            </View>
          </Panel>

          <View style={styles.gap16}>
            {quick('MapPin', colors.mutedForeground, `${D}.location`, provider.location)}
            {quick('Clock', palette.success, `${D}.nextAvailable`, t(provider.nextAvailableKey), palette.success)}
            {quick('Shield', colors.mutedForeground, `${D}.experience`, t(`${D}.providerExperience`, { years: provider.years }))}
          </View>

          <Tabs defaultValue="about" style={styles.gap16}>
            <TabsList style={styles.split}>
              {(['about', 'services', 'reviews', 'availability'] as const).map((v) => (
                <TabsTrigger key={v} value={v} style={styles.flex} testID={`provider-tab-${v}`}>
                  {t(`${D}.${v}`)}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="about">
              <Panel style={styles.tabCard}>
                <Text size="lg" weight="600">
                  {t(`${D}.aboutName`, { name: provider.name })}
                </Text>
                <Text muted>{t(provider.aboutKey)}</Text>
                <View style={styles.gap12}>
                  <View style={styles.row}>
                    <CommerceIcon name="GraduationCap" size={20} color={colors.mutedForeground} />
                    <Text weight="500">{t(`${D}.specialty2`)}</Text>
                    <Text muted>{t(provider.specialtyKey)}</Text>
                  </View>
                  <View style={styles.row}>
                    <CommerceIcon name="Shield" size={20} color={colors.mutedForeground} />
                    <Text weight="500">{t(`${D}.experience`)}</Text>
                    <Text muted>{t(`${D}.providerExperience`, { years: provider.years })}</Text>
                  </View>
                </View>
              </Panel>
            </TabsContent>
            <TabsContent value="services">
              <Panel style={styles.tabCard} testID="provider-services">
                <Text size="lg" weight="600">
                  {t(`${D}.servicesPricing`)}
                </Text>
                {[
                  [`${D}.initialConsultation`, `${D}.text60Minutes`, provider.priceRange.split('-')[0].trim()],
                  [`${D}.followupSession`, `${D}.text30Minutes`, '$150'],
                ].map(([name, length, price]) => (
                  <View key={name} style={[styles.service, { borderColor: colors.border }]}>
                    <View>
                      <Text weight="500">{t(name)}</Text>
                      <Text size="sm" muted>
                        {t(length)}
                      </Text>
                    </View>
                    <Text size="lg" weight="700">
                      {price}
                    </Text>
                  </View>
                ))}
              </Panel>
            </TabsContent>
            <TabsContent value="reviews">
              <Panel style={styles.tabCard}>
                <Text size="lg" weight="600">
                  {t(`${D}.patientReviews`)}
                </Text>
                <Text muted>{t(`${D}.reviewsFeatureComingSoon`)}</Text>
              </Panel>
            </TabsContent>
            <TabsContent value="availability">
              <Panel style={styles.tabCard}>
                <Text size="lg" weight="600">
                  {t(`${D}.availability`)}
                </Text>
                <Text muted>{t(`${D}.calendarIntegrationComingSoon`)}</Text>
              </Panel>
            </TabsContent>
          </Tabs>
        </View>
      </ScreenScroll>

      <BookingPaymentFlow
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        booking={bookingFor(provider, t)}
        userBalance={{ credits: getBalance('CREDITS') || 0, usd: getBalance('USD') || 0 }}
        onBookingComplete={async () => {
          await saveAppointment(appointmentFor(provider, t));
          setBookingOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  page: { padding: 24, gap: 24 },
  back: { alignSelf: 'flex-start' },
  notFound: { flex: 1, padding: 32, alignItems: 'center', gap: 16 },
  profile: { padding: 32, gap: 12 },
  photo: { width: 128, height: 128 },
  tick: { position: 'absolute', bottom: -8, end: -8, borderRadius: 999, padding: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 },
  gap12: { gap: 12, marginTop: 12 },
  gap16: { gap: 16 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  split: { flexDirection: 'row' },
  tabCard: { padding: 24, gap: 12 },
  service: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 8 },
});
