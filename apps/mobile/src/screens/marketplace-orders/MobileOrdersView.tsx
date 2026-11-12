/**
 * VTID-05511 — the `MobileOrdersView` native twin (this lane owns it), port of
 * `src/components/orders/MobileOrdersView.tsx`:
 *  - header: "My Orders" (StandardHeader's phone branch, the title only);
 *  - the sticky compact utility rail: Search (filters both tabs by title,
 *    subtitle or ticket number), the Orders mode pill (📦 Active / ✅ History),
 *    Calendar, then Life Compass, Gift Voucher (iOS-gated as today) and the
 *    Vitana Index + Autopilot chips;
 *  - the "Sample Data" banner while the sample tickets show;
 *  - the active tab's cards (image or type tile, title, status badge,
 *    subtitle, date + venue, price, × quantity, chevron), the loading
 *    skeletons (3 × 100 px) or the empty state (Package / CheckCircle icon,
 *    title, description, "Browse Products" → /discover, "Find Events" →
 *    /comm/events-meetups);
 *  - a card opens the order detail sheet.
 * `?tab=active|history` picks the pill (an explicit valid value only, like
 * the web effect :76-80). View / track only: no buy control.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import { alpha, CommerceIcon, useCommercePalette } from '../../ports/marketplace-orders';
import { MobileModePill, type ModeOption } from '../../shell/components/MobileModePill';
import { navigateToWebPath } from '../../navigation/navigate';
import { useI18n } from '../../i18n/I18nProvider';
import { MobileHeader, PulseSkeletons, ScreenScroll } from './components';
import { formatDate } from './format';
import { OrderDetailSheet } from './OrderDetailSheet';
import { CalendarButton, MobileActionChips, SearchButton, UtilityBar } from './UtilityBar';
import { filterOrders, hasImage, statusVariant, type UnifiedMobileOrder } from './data/orders';

type Mode = 'active' | 'history';

export function MobileOrdersView({ activeOrders, historyOrders, isLoading, isShowingMockData }: { activeOrders: UnifiedMobileOrder[]; historyOrders: UnifiedMobileOrder[]; isLoading: boolean; isShowingMockData?: boolean }): ReactElement {
  const { t, locale } = useI18n();
  const { colors } = useUITheme();
  const palette = useCommercePalette();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UnifiedMobileOrder | null>(null);
  const [mode, setMode] = useState<Mode>(() => (params.tab === 'history' ? 'history' : 'active'));

  useEffect(() => {
    if (params.tab === 'active' || params.tab === 'history') setMode(params.tab);
  }, [params.tab]);

  const modes: ModeOption[] = [
    { value: 'active', label: t('orders.tabs.active'), icon: '📦' },
    { value: 'history', label: t('orders.tabs.history'), icon: '✅' },
  ];
  const onModeChange = (v: string) => setMode(v === 'history' ? 'history' : 'active');

  const shownActive = useMemo(() => filterOrders(activeOrders, query), [activeOrders, query]);
  const shownHistory = useMemo(() => filterOrders(historyOrders, query), [historyOrders, query]);
  const list = mode === 'active' ? shownActive : shownHistory;

  const tile = (order: UnifiedMobileOrder) => {
    if (hasImage(order.imageUrl)) return <Image source={{ uri: order.imageUrl }} style={styles.thumb} accessibilityLabel={order.title} />;
    const bg = order.type === 'ticket' ? alpha(palette.category3, 0.15) : order.type === 'voucher' ? alpha(palette.category2, 0.15) : order.type === 'product' ? palette.successSubtle : colors.muted;
    const emoji = order.type === 'ticket' ? '🎫' : order.type === 'voucher' ? '🎁' : order.type === 'product' ? '📦' : '🩺';
    return (
      <View style={[styles.thumb, styles.center, { backgroundColor: bg }]} testID={`mo-order-tile-${order.type}`}>
        <Text size="xl">{emoji}</Text>
      </View>
    );
  };

  return (
    <View style={styles.fill} testID="screen-orders">
      <ScreenScroll stickyHeaderIndices={[1]}>
        <View style={styles.pad}>
          <MobileHeader title={t('orders.myOrders')} />
        </View>
        <View style={[styles.sticky, { backgroundColor: alpha(colors.background, 0.95), borderBottomColor: alpha(colors.border, 0.2) }]}>
          <View style={styles.pad}>
            <UtilityBar compact returnTo="/discover/orders" afterGiftVoucher={<MobileActionChips />}>
              <SearchButton placeholder={t('orders.searchPlaceholder')} onSearch={setQuery} testID="orders-search" />
              <MobileModePill modes={modes} activeMode={mode} onModeChange={onModeChange} title={t('orders.myOrders')} />
              <CalendarButton />
            </UtilityBar>
          </View>
        </View>

        {isShowingMockData ? (
          <View style={[styles.mock, { backgroundColor: palette.warningSubtle, borderColor: alpha(palette.warning, 0.25) }]} testID="orders-sample-banner">
            <View style={[styles.mockBadge, { borderColor: alpha(palette.warning, 0.4) }]}>
              <Text size="xs" color={palette.warning}>
                {t('orders.sampleData')}
              </Text>
            </View>
            <Text size="xs" color={palette.warning} style={styles.flex}>
              {t('orders.previewNotice')}
            </Text>
          </View>
        ) : null}

        <View style={[styles.pad, styles.content]} testID={`orders-${mode}`}>
          {isLoading ? (
            <PulseSkeletons rows={3} height={100} testID="orders-loading" />
          ) : list.length > 0 ? (
            list.map((order) => (
              <Pressable
                key={order.id}
                testID={`order-card-${order.id}`}
                accessibilityRole="button"
                accessibilityLabel={order.title}
                onPress={() => setSelected(order)}
                style={({ pressed }) => [styles.card, { backgroundColor: alpha(colors.card, 0.7), borderColor: alpha(colors.border, 0.3) }, pressed ? styles.pressed : null]}
              >
                {tile(order)}
                <View style={styles.details}>
                  <View style={styles.titleRow}>
                    <Text size="sm" weight="600" numberOfLines={1} style={styles.flex}>
                      {order.title}
                    </Text>
                    <Badge variant={statusVariant(order.status)}>
                      <Text style={styles.badgeText}>{order.statusLabel}</Text>
                    </Badge>
                  </View>
                  <Text size="xs" muted numberOfLines={1}>
                    {order.subtitle}
                  </Text>
                  <View style={styles.meta}>
                    <View style={styles.metaItem}>
                      <CommerceIcon name="Calendar" size={12} color={colors.mutedForeground} />
                      <Text size="xs" muted>
                        {order.eventDate ? formatDate(order.eventDate, 'MMM d', locale) : order.orderDate}
                      </Text>
                    </View>
                    {order.eventLocation ? (
                      <View style={[styles.metaItem, styles.flex]}>
                        <CommerceIcon name="MapPin" size={12} color={colors.mutedForeground} />
                        <Text size="xs" muted numberOfLines={1} style={styles.flex}>
                          {order.eventLocation}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.priceRow}>
                    <Text size="sm" weight="700">
                      {order.price}
                    </Text>
                    {order.quantity && order.quantity > 1 ? (
                      <Text size="xs" muted>
                        {`× ${order.quantity}`}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <CommerceIcon name="ChevronRight" size={20} color={colors.mutedForeground} />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty} testID={`orders-empty-${mode}`}>
              <View style={[styles.emptyIcon, { backgroundColor: alpha(colors.muted, 0.3) }]}>
                <CommerceIcon name={mode === 'active' ? 'Package' : 'CheckCircle'} size={32} color={alpha(colors.mutedForeground, 0.6)} />
              </View>
              <Text weight="600" accessibilityRole="header" style={styles.centerText}>
                {mode === 'active' ? t('orders.emptyActive.title') : t('orders.emptyHistory.title')}
              </Text>
              <Text size="sm" muted style={styles.centerText}>
                {mode === 'active' ? t('orders.emptyActive.description') : t('orders.emptyHistory.description')}
              </Text>
              <View style={styles.row}>
                <Button size="sm" onPress={() => navigateToWebPath('/discover')} testID="orders-browse-products">
                  {t('orders.browseProducts')}
                </Button>
                <Button size="sm" variant="outline" onPress={() => navigateToWebPath('/comm/events-meetups')} testID="orders-find-events">
                  {t('orders.findEvents')}
                </Button>
              </View>
            </View>
          )}
        </View>
      </ScreenScroll>

      <OrderDetailSheet order={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 16 },
  sticky: { borderBottomWidth: 1, zIndex: 20 },
  content: { paddingTop: 12, gap: 12 },
  mock: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mockBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 16 },
  pressed: { transform: [{ scale: 0.99 }] },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  badgeText: { fontSize: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  flex: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 16, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  centerText: { textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
