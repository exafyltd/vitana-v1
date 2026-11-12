/**
 * VTID-05510 — the page chrome the Discover sub-catalogues share:
 *  - `SubNavigation` (src/components/SubNavigation.tsx with
 *    `discoverNavigation`, src/config/navigation.ts:35-42): the horizontally
 *    scrolling route pills, the active one on `muted`. The web labels are the
 *    config's English names (no i18nKey); natively they come from the
 *    existing `subNav.*` catalog keys;
 *  - `MobileHeader` (StandardHeader.tsx mobile branch): the bold title only;
 *  - `QuickActionsDialog` (DiscoverShopActionPopup.tsx / DiscoverBookActionPopup.tsx):
 *    the eight-tile dialog behind "+ Action"; every tile toasts
 *    `toasts.discover.actionSelected` and closes;
 *  - `HiddenByLimitationsFooter` (HiddenByLimitationsFooter.tsx): "N products
 *    hidden by your preferences", expandable to one row per reason with
 *    "Adjust" → /settings/limitations#….
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, Dialog, DialogContent, DialogHeader, DialogTitle, DiscoverIcon, notify, useTonePalette, type DiscoverTone } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import type { HiddenBreakdown } from './data/marketplace';

/** src/config/navigation.ts discoverNavigation, labels from `subNav.*`. */
export const DISCOVER_NAV: ReadonlyArray<{ id: string; key: string; path: string }> = [
  { id: 'overview', key: 'subNav.overview', path: '/discover' },
  { id: 'supplements', key: 'subNav.supplements', path: '/discover/supplements' },
  { id: 'wellness-services', key: 'subNav.wellnessServices', path: '/discover/wellness-services' },
  { id: 'doctors-coaches', key: 'subNav.doctorsCoaches', path: '/discover/doctors-coaches' },
  { id: 'deals-offers', key: 'subNav.dealsOffers', path: '/discover/deals-offers' },
  { id: 'orders', key: 'subNav.orders', path: '/discover/orders' },
];

export function SubNavigation({ activePath }: { activePath: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  return (
    <View style={[styles.subNav, { borderBottomColor: colors.border, backgroundColor: alpha(colors.background, 0.95) }]} testID="discover-subnav">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subNavRow}>
        {DISCOVER_NAV.map((item) => {
          const active = item.path === activePath;
          return (
            <Pressable
              key={item.id}
              testID={`discover-subnav-${item.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => navigateToWebPath(item.path)}
              style={[styles.subNavItem, active ? { backgroundColor: colors.muted } : null]}
            >
              <Text size="sm" weight="500" color={active ? colors.foreground : colors.mutedForeground}>
                {t(item.key)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function MobileHeader({ title }: { title: string }): ReactElement {
  return (
    <View style={styles.header}>
      <Text size="lg" weight="700" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

type QuickAction = { icon: string; key: string; tone: DiscoverTone | 'primary' };

/** DiscoverShopActionPopup.tsx actions (labels from discoverCommerceNative.quickShop.*). */
export const SHOP_ACTIONS: readonly QuickAction[] = [
  { icon: 'ShoppingCart', key: 'viewCart', tone: 'primary' },
  { icon: 'Zap', key: 'quickCheckout', tone: 'category-6' },
  { icon: 'RotateCcw', key: 'reorderPrevious', tone: 'category-3' },
  { icon: 'CreditCard', key: 'managePayment', tone: 'category-2' },
  { icon: 'Package', key: 'trackOrders', tone: 'category-5' },
  { icon: 'Bell', key: 'setPriceAlert', tone: 'category-5' },
  { icon: 'Heart', key: 'viewSavedItems', tone: 'category-4' },
  { icon: 'Tag', key: 'applyCoupon', tone: 'category-8' },
];

/** DiscoverBookActionPopup.tsx actions (labels from discoverCommerceNative.quickBook.*). */
export const BOOK_ACTIONS: readonly QuickAction[] = [
  { icon: 'Calendar', key: 'bookAppointment', tone: 'primary' },
  { icon: 'RotateCcw', key: 'rebookPrevious', tone: 'category-3' },
  { icon: 'MapPin', key: 'findNearMe', tone: 'category-6' },
  { icon: 'MessageSquare', key: 'messageProvider', tone: 'category-2' },
  { icon: 'Clock', key: 'viewMyBookings', tone: 'category-5' },
  { icon: 'Bell', key: 'setReminders', tone: 'category-5' },
  { icon: 'Star', key: 'leaveReview', tone: 'category-4' },
  { icon: 'CreditCard', key: 'paymentHistory', tone: 'category-8' },
];

export function QuickActionsDialog({ kind, open, onOpenChange }: { kind: 'shop' | 'book'; open: boolean; onOpenChange: (open: boolean) => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const actions = kind === 'shop' ? SHOP_ACTIONS : BOOK_ACTIONS;
  const ns = kind === 'shop' ? 'quickShop' : 'quickBook';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent testID={`quick-${kind}-actions`}>
        <DialogHeader>
          <DialogTitle>{kind === 'shop' ? t('screens.discover.quickShopActions') : t('screens.discover.quickBookActions')}</DialogTitle>
        </DialogHeader>
        <View style={styles.grid}>
          {actions.map((a) => {
            const tint = a.tone === 'primary' ? colors.primary : tone(a.tone);
            return (
              <Pressable
                key={a.key}
                testID={`quick-action-${a.key}`}
                accessibilityRole="button"
                onPress={() => {
                  notify('toasts.discover.actionSelected');
                  onOpenChange(false);
                }}
                style={[styles.tile, { borderColor: colors.border }]}
              >
                <View style={[styles.tileIcon, { backgroundColor: alpha(tint, 0.1) }]}>
                  <DiscoverIcon name={a.icon} size={24} color={tint} />
                </View>
                <Text size="sm" weight="500" style={styles.center}>
                  {t(`discoverCommerceNative.${ns}.${a.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DialogContent>
    </Dialog>
  );
}

/** HiddenByLimitationsFooter.tsx REASON_LABELS (texts from discoverCommerceNative.hidden.*). */
const REASON_HREF: Record<keyof HiddenBreakdown, string> = {
  allergies: '/settings/limitations#allergies',
  contraindications: '/settings/limitations#medications',
  medications: '/settings/limitations#medications',
  dietary: '/settings/limitations#dietary',
  budget: '/settings/limitations#budget',
  sensitivities: '/settings/limitations',
  geo: '/settings/limitations',
  excluded_region: '/settings/limitations',
  past_purchases: '/settings/limitations',
};

export function HiddenByLimitationsFooter({ breakdown }: { breakdown?: HiddenBreakdown | null }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const [expanded, setExpanded] = useState(false);
  if (!breakdown) return null;
  const total = Object.values(breakdown).reduce((a: number, b) => a + (b ?? 0), 0);
  if (total === 0) return null;
  const rows = Object.entries(breakdown)
    .filter(([, v]) => (v ?? 0) > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
  return (
    <View style={[styles.hidden, { borderColor: alpha(colors.statusSuccess, 0.25), backgroundColor: alpha(colors.statusSuccessSubtle, 0.6) }]} testID="hidden-by-limitations">
      <Pressable testID="hidden-by-limitations-toggle" accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded((v) => !v)} style={styles.hiddenHead}>
        <View style={styles.inline}>
          <DiscoverIcon name="Shield" size={16} color={colors.statusSuccess} />
          <Text size="sm" color={colors.statusSuccess}>
            <Text size="sm" weight="700" color={colors.statusSuccess}>
              {String(total)}
            </Text>
            {` ${t('screens.discover.value0HiddenByYourPreferences', { value0: total === 1 ? t('discoverCommerceNative.hidden.product') : t('discoverCommerceNative.hidden.products') })}`}
          </Text>
        </View>
        <DiscoverIcon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={16} color={colors.statusSuccess} />
      </Pressable>
      {expanded ? (
        <View style={styles.hiddenRows}>
          {rows.map(([key, count]) => {
            const href = REASON_HREF[key as keyof HiddenBreakdown];
            if (!href) return null;
            return (
              <View key={key} style={styles.hiddenRow} testID={`hidden-reason-${key}`}>
                <Text size="sm" color={alpha(colors.statusSuccess, 0.8)} style={styles.flex}>
                  <Text size="sm" weight="700" color={alpha(colors.statusSuccess, 0.8)}>
                    {String(count)}
                  </Text>
                  {` ${t(`discoverCommerceNative.hidden.${key}`)}`}
                </Text>
                <Button variant="ghost" size="sm" testID={`hidden-adjust-${key}`} onPress={() => navigateToWebPath(href)}>
                  {t('screens.discover.adjust')}
                </Button>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  subNav: { borderBottomWidth: 1 },
  subNavRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 24, paddingVertical: 12 },
  subNavItem: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  header: { paddingTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  tile: { width: '46%', flexGrow: 1, alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  tileIcon: { padding: 12, borderRadius: 999 },
  hidden: { marginTop: 24, borderRadius: 8, borderWidth: 1, padding: 16 },
  hiddenHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hiddenRows: { marginTop: 12, gap: 6, paddingStart: 24 },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
