/**
 * VTID-05511 — the provider-directory pieces shared by Doctors & Coaches and
 * the provider profile, each a twin of the web part:
 *  - `DiscoverSubNav` — `SubNavigation items={discoverNavigation}`
 *    (src/components/SubNavigation.tsx, src/config/navigation.ts:35-42): the
 *    horizontally scrolling Discover tabs, the current one raised. The web
 *    renders the items' English `name` (they carry no i18n key); natively the
 *    labels come from the catalog (the i18n rule), with the same words in en;
 *  - `BookmarkButton` (src/components/bookmarks/BookmarkButton.tsx): the
 *    ghost icon at the card's top-end, filled warning-yellow when bookmarked,
 *    a short bounce on toggle;
 *  - `BookActionPopup` (src/components/discover/DiscoverBookActionPopup.tsx):
 *    "Quick Book Actions", eight tiles, each toasts "Action selected" and closes;
 *  - `VisitHistoryCard` (src/components/discover/VisitHistoryCard.tsx); the notes
 *    toggle reads "View Notes" / "Hide Notes" from this lane's keys (the web's
 *    `value0Notes` template glues an English word onto a localised one);
 *  - `ProviderAvatar` — the provider photo. The web photos are web-relative
 *    assets (`/lovable-uploads/...`) the native app does not bundle, so the
 *    avatar shows the initials fallback (a remote `https` image would load).
 */
import { useRef, useState, type ReactElement } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { Avatar, Badge, Button, Text, notify, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, Dialog, DialogContent, DialogHeader, DialogTitle, useCommercePalette } from '../../ports/marketplace-orders';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { formatDate } from './format';
import type { Appointment, BookmarkItem } from './data/providers';

const K = 'discoverCommerceNative.marketplaceOrders';

const DISCOVER_NAV = [
  { id: 'overview', path: '/discover' },
  { id: 'supplements', path: '/discover/supplements' },
  { id: 'wellness-services', path: '/discover/wellness-services' },
  { id: 'doctors-coaches', path: '/discover/doctors-coaches' },
  { id: 'deals-offers', path: '/discover/deals-offers' },
  { id: 'orders', path: '/discover/orders' },
];

export function DiscoverSubNav(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const pathname = usePathname();
  return (
    <View style={[styles.subnav, { borderBottomColor: colors.border, backgroundColor: alpha(colors.background, 0.95) }]} testID="mo-subnav">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subnavRow}>
        {DISCOVER_NAV.map((item) => {
          const on = pathname === item.path;
          return (
            <Pressable
              key={item.id}
              testID={`mo-subnav-${item.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => navigateToWebPath(item.path)}
              style={[styles.subnavItem, on ? { backgroundColor: colors.muted } : null]}
            >
              <Text size="sm" weight="500" color={on ? colors.foreground : colors.mutedForeground}>
                {t(`${K}.subnav.${item.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function BookmarkButton({ item, bookmarked, onToggle }: { item: BookmarkItem; bookmarked: boolean; onToggle: (item: BookmarkItem) => Promise<boolean> }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const bounce = useRef(new Animated.Value(0)).current;
  const press = async () => {
    Animated.sequence([
      Animated.timing(bounce, { toValue: -6, duration: 150, useNativeDriver: true }),
      Animated.timing(bounce, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    await onToggle(item);
  };
  return (
    <Animated.View style={[styles.bookmark, { transform: [{ translateY: bounce }] }]}>
      <Pressable
        testID={`mo-bookmark-${item.item_id}`}
        accessibilityRole="button"
        accessibilityState={{ selected: bookmarked }}
        accessibilityLabel={bookmarked ? t(`${K}.bookmark.remove`) : t(`${K}.bookmark.add`)}
        onPress={() => void press()}
        style={styles.bookmarkHit}
      >
        <CommerceIcon name="Bookmark" size={20} color={bookmarked ? palette.warning : colors.primaryForeground} fill={bookmarked ? palette.warning : 'none'} />
      </Pressable>
    </Animated.View>
  );
}

const ACTIONS: Array<{ id: string; icon: string; tone: 'primary' | 'info' | 'success' | 'category2' | 'warning' | 'yellow' | 'category4' | 'error' }> = [
  { id: 'bookAppointment', icon: 'Calendar', tone: 'primary' },
  { id: 'rebookPrevious', icon: 'RotateCcw', tone: 'info' },
  { id: 'findNearMe', icon: 'MapPin', tone: 'success' },
  { id: 'messageProvider', icon: 'MessageSquare', tone: 'category2' },
  { id: 'viewMyBookings', icon: 'Clock', tone: 'warning' },
  { id: 'setReminders', icon: 'Bell', tone: 'yellow' },
  { id: 'leaveReview', icon: 'Star', tone: 'category4' },
  { id: 'paymentHistory', icon: 'CreditCard', tone: 'error' },
];

export function BookActionPopup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const toneColor = { primary: colors.primary, info: palette.info, success: palette.success, category2: palette.category2, warning: palette.warning, yellow: palette.warning, category4: palette.category4, error: palette.error };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID="mo-book-actions">
        <DialogHeader>
          <DialogTitle>{t('screens.discover.quickBookActions')}</DialogTitle>
        </DialogHeader>
        <View style={styles.actionGrid}>
          {ACTIONS.map((a) => (
            <Button
              key={a.id}
              variant="outline"
              style={styles.actionTile}
              testID={`mo-book-action-${a.id}`}
              onPress={() => {
                notify('toasts.discover.actionSelected');
                onOpenChange(false);
              }}
            >
              <View style={[styles.actionDisc, { backgroundColor: alpha(toneColor[a.tone], 0.1) }]}>
                <CommerceIcon name={a.icon} size={24} color={toneColor[a.tone]} />
              </View>
              <Text size="sm" weight="500" style={styles.center}>
                {t(`${K}.bookActions.${a.id}`)}
              </Text>
            </Button>
          ))}
        </View>
      </DialogContent>
    </Dialog>
  );
}

export function ProviderAvatar({ name, image, size }: { name: string; image: string; size: number }): ReactElement {
  const initials = name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return <Avatar uri={/^https?:\/\//.test(image) ? image : null} fallback={initials} size={size} />;
}

export function VisitHistoryCard({ visit }: { visit: Appointment }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const [notesOpen, setNotesOpen] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID={`mo-visit-${visit.id}`}>
      <View style={styles.between}>
        <View style={styles.row}>
          <ProviderAvatar name={visit.provider_name} image={visit.provider_image_url || ''} size={48} />
          <View>
            <Text weight="600">{visit.provider_name}</Text>
            <Text size="sm" muted>
              {visit.provider_specialty}
            </Text>
          </View>
        </View>
        <Badge variant="secondary">{t('screens.discover.completed')}</Badge>
      </View>
      <View style={styles.gap8}>
        <View style={styles.row}>
          <CommerceIcon name="Calendar" size={16} color={colors.mutedForeground} />
          <Text size="sm" muted>
            {formatDate(new Date(visit.start_time), 'MMM dd, yyyy', locale)}
          </Text>
        </View>
        <View style={styles.row}>
          <CommerceIcon name="Clock" size={16} color={colors.mutedForeground} />
          <Text size="sm" muted>
            {t('screens.discover.duration_minutesMinutes', { duration_minutes: visit.duration_minutes })}
          </Text>
        </View>
      </View>
      {visit.patient_notes ? (
        <View>
          <Button variant="ghost" size="sm" onPress={() => setNotesOpen((v) => !v)} testID={`mo-visit-notes-${visit.id}`} style={styles.startSelf}>
            {notesOpen ? t(`${K}.visit.hideNotes`) : t(`${K}.visit.viewNotes`)}
          </Button>
          {notesOpen ? (
            <Text size="sm" style={[styles.notes, { backgroundColor: alpha(colors.muted, 0.5) }]}>
              {visit.patient_notes}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.row}>
        <Button size="sm" variant="outline">
          {t('screens.discover.bookFollowup')}
        </Button>
        <Button size="sm" variant="outline">
          {t('screens.discover.viewDetails')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subnav: { borderBottomWidth: 1 },
  subnavRow: { paddingHorizontal: 24, paddingVertical: 12, gap: 4 },
  subnavItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  bookmark: { position: 'absolute', top: 4, end: 4, zIndex: 10 },
  bookmarkHit: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  actionTile: { width: '47%', height: 'auto', paddingVertical: 20, paddingHorizontal: 12, flexDirection: 'column', gap: 10 },
  actionDisc: { padding: 12, borderRadius: 999 },
  center: { textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 20, gap: 12 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gap8: { gap: 8 },
  startSelf: { alignSelf: 'flex-start' },
  notes: { marginTop: 8, padding: 12, borderRadius: 4 },
});
