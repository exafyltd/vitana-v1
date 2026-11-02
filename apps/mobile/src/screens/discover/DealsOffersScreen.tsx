/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover/deals-offers`
 * (DISCOVER.DEALS, `?tab=trending` DISCOVER.DEALS_TRENDING, `?tab=ai`
 * DISCOVER.DEALS_AI, `?tab=saved` DISCOVER.DEALS_SAVED; allowGuest), the phone
 * branch of src/pages/discover/DealsOffers.tsx (`DealsOffersLegacy`):
 * SubNavigation · header · rail (Search · Calendar · + Action → quick shop
 * actions · Life Compass · Gift Voucher · Refresh) · Flash Deals / Trending /
 * AI Picks / Saved, the tab in the `tab` param (`useUrlTab("tab","flash")`:
 * the default removes the param).
 *
 *  - Flash Deals: `GET /discover/search?sort=relevance&limit=48`, kept where
 *    compare-at > price; empty card, or one card per deal (bookmark, image,
 *    "−N% off", title, provider, stars, the price / struck original / "Save
 *    $x", "View deal" → product drawer, icon add-to-cart);
 *  - Trending / AI Picks / Saved: the web's static sample rows (deals-data.ts)
 *    with their badges, slots, benefits, price-drop lines and buttons.
 *
 * Web defect not reproduced: the web passes review counts to `fmtDateTime`
 * (DealsOffers.tsx:536, :645, :844), which prints an epoch date; the native
 * cards print the count with the locale number format.
 *
 * iOS IAP gate flag (R5): add-to-cart purchase surface on every tab — today's
 * behaviour (no iOS gate on add-to-cart; `iapRestricted`,
 * shell/logic/drawer.ts:37-38, unchanged); deferred decision.
 */
import { useMemo, type ReactElement } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, useToneColor } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { AddToCartButton } from './AddToCartButton';
import { BookmarkButton } from './BookmarkButton';
import { ProductImage, StarRow, useFmtNumber } from './parts';
import { ProductDetailsDrawer, ProductSelectionProvider, useProductSelection } from './ProductDetailsDrawer';
import { SubCatalogueFrame } from './SubCatalogueFrame';
import { PERSONALIZED_MATCHES, SAVED_PRODUCTS, TRENDING_SERVICES } from './deals-data';
import { useMarketplaceSearch, type MarketplaceProduct } from './data/marketplace';

interface DealCard {
  id: string;
  title: string;
  provider: string;
  originalPrice: number;
  price: number;
  discount: number;
  image: string | null;
  rating: number;
  reviews: number;
  category: string;
  _product: MarketplaceProduct;
}

/** web flashDeals: discounted marketplace products. */
export function toFlashDeals(items: MarketplaceProduct[]): DealCard[] {
  return items
    .filter((p) => p.compare_at_price_cents != null && p.price_cents != null && p.compare_at_price_cents > p.price_cents)
    .map((p) => {
      const price = (p.price_cents ?? 0) / 100;
      const originalPrice = (p.compare_at_price_cents ?? 0) / 100;
      return {
        id: p.id,
        title: p.title,
        provider: p.brand ?? 'Vitana Shop',
        originalPrice,
        price,
        discount: Math.round((1 - price / originalPrice) * 100),
        image: p.images?.[0] ?? null,
        rating: p.rating ?? 0,
        reviews: p.review_count ?? 0,
        category: p.subcategory ?? p.category ?? 'supplements',
        _product: p,
      };
    });
}

function CornerTag({ children, tone, side = 'end' }: { children: ReactElement | ReactElement[]; tone: string; side?: 'start' | 'end' }): ReactElement {
  return <View style={[styles.cornerTag, side === 'end' ? styles.tagEnd : styles.tagStart, { backgroundColor: tone }]}>{children}</View>;
}

function DealsInner(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFmtNumber();
  const violet = useToneColor('category-2');
  const params = useLocalSearchParams<{ tab?: string }>();
  const activeTab = params.tab || 'flash';
  const setTab = (next: string) => router.setParams({ tab: !next || next === 'flash' ? undefined : next });
  const { selectProduct } = useProductSelection();
  const { data: dealsSearch } = useMarketplaceSearch({ limit: 48, sort: 'relevance' });
  const flashDeals = useMemo(() => toFlashDeals(dealsSearch?.items ?? []), [dealsSearch]);
  const card = [styles.card, { backgroundColor: alpha(colors.card, 0.9), borderColor: colors.border }];
  const onPrimary = colors.primaryForeground;

  const tabs = [
    { value: 'flash', label: t('screens.discover.flashDeals') },
    { value: 'trending', label: t('screens.discover.trending') },
    { value: 'ai', label: t('screens.discover.aiPicks') },
    { value: 'saved', label: t('screens.discover.saved') },
  ];

  let content: ReactElement;
  if (activeTab === 'trending') {
    content = (
      <View style={styles.stack} testID="deals-trending">
        {TRENDING_SERVICES.map((s) => (
          <View key={s.id} style={card}>
            <BookmarkButton item={{ item_type: 'wellness_service', item_id: String(s.id), item_name: s.title, item_image_url: s.image, item_metadata: { provider: s.provider, price: s.price, location: s.location, description: s.description } }} />
            <View>
              <Image source={{ uri: s.image }} accessibilityLabel={s.title} style={styles.media} />
              <CornerTag tone={colors.statusWarning}>
                <DiscoverIcon name="TrendingUp" size={12} color={onPrimary} />
                <Text size="sm" weight="700" color={onPrimary}>
                  {s.trend}
                </Text>
              </CornerTag>
            </View>
            <View style={styles.body}>
              <View>
                <Text weight="600" numberOfLines={2}>
                  {s.title}
                </Text>
                <Text size="sm" muted numberOfLines={1}>
                  {s.description}
                </Text>
              </View>
              <StarRow rating={s.rating}>
                <Text size="sm" muted>{`${s.rating} (${fmt(s.reviews)})`}</Text>
              </StarRow>
              <View style={styles.inline}>
                <DiscoverIcon name="MapPin" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {s.location}
                </Text>
                <Text size="sm" muted style={styles.pushEnd}>
                  {t('screens.discover.bookingsBookings', { bookings: s.bookings })}
                </Text>
              </View>
              <View style={styles.wrap}>
                {s.availableSlots.map((slot) => (
                  <Badge key={slot} variant="outline">
                    {slot}
                  </Badge>
                ))}
              </View>
              <View style={styles.baseline}>
                <Text size="2xl" weight="700">{`$${s.price}`}</Text>
                <Text size="sm" muted>
                  {t('screens.discover.perSession')}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button style={styles.flex} testID={`deals-book-${s.id}`}>
                  {t('screens.discover.bookNow')}
                </Button>
                <AddToCartButton
                  item={{ item_type: 'wellness_service', item_id: String(s.id), item_name: s.title, item_price: s.price, item_image_url: s.image, item_metadata: { location: s.location, bookings: s.bookings, trend: s.trend } }}
                  variant="outline"
                  size="icon"
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  } else if (activeTab === 'ai') {
    content = (
      <View style={styles.stack} testID="deals-ai">
        {PERSONALIZED_MATCHES.map((m) => (
          <View key={m.id} style={[card, { borderColor: alpha(violet, 0.25) }]}>
            <BookmarkButton item={{ item_type: 'wellness_service', item_id: String(m.id), item_name: m.title, item_image_url: m.image, item_metadata: { provider: m.provider, price: m.price, match: m.match, reason: m.reason } }} />
            <View>
              <Image source={{ uri: m.image }} accessibilityLabel={m.title} style={styles.media} />
              <CornerTag tone={violet}>
                <Text size="sm" weight="700" color={onPrimary}>
                  {t('screens.discover.matchMatch', { match: m.match })}
                </Text>
              </CornerTag>
            </View>
            <View style={styles.body}>
              <View>
                <Text weight="600" numberOfLines={2}>
                  {m.title}
                </Text>
                <Text size="sm" muted>
                  {m.provider}
                </Text>
                <Text size="xs" muted>
                  {m.credentials}
                </Text>
              </View>
              <View style={[styles.reason, { backgroundColor: alpha(violet, 0.1) }]}>
                <DiscoverIcon name="Brain" size={16} color={violet} />
                <Text size="sm" weight="500" color={violet} style={styles.flex}>
                  {m.reason}
                </Text>
              </View>
              <View style={styles.inline}>
                <DiscoverIcon name="Clock" size={16} color={colors.mutedForeground} />
                <Text size="sm" muted>
                  {m.availableTime}
                </Text>
              </View>
              <View style={styles.wrap}>
                <Badge variant="outline">{m.duration}</Badge>
                <Badge variant="outline">{m.format}</Badge>
              </View>
              <View style={styles.list}>
                {m.benefits.map((b) => (
                  <View key={b} style={styles.inline}>
                    <View style={[styles.dot, { backgroundColor: colors.statusSuccess }]} />
                    <Text size="xs" muted>
                      {b}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.baseline}>
                <Text size="2xl" weight="700">{`$${m.price}`}</Text>
                <Text size="sm" muted>
                  {m.period}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button style={styles.flex} testID={`deals-consult-${m.id}`}>
                  {t('screens.discover.bookConsultation')}
                </Button>
                <AddToCartButton
                  item={{ item_type: 'wellness_service', item_id: String(m.id), item_name: m.title, item_price: m.price, item_image_url: m.image, item_metadata: { match: m.match, reason: m.reason, provider: m.provider } }}
                  variant="outline"
                  size="icon"
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  } else if (activeTab === 'saved') {
    content = (
      <View style={styles.stack} testID="deals-saved">
        {SAVED_PRODUCTS.map((p) => (
          <View key={p.id} style={card}>
            <BookmarkButton item={{ item_type: 'deal', item_id: String(p.id), item_name: p.title, item_image_url: p.image, item_metadata: { brand: p.brand, price: p.price, priceChange: p.priceChange } }} />
            <View>
              <Image source={{ uri: p.image }} accessibilityLabel={p.title} style={styles.media} />
              {p.priceChange < 0 ? (
                <CornerTag tone={colors.statusSuccess} side="start">
                  <DiscoverIcon name="TrendingDown" size={12} color={onPrimary} />
                  <Text size="sm" weight="700" color={onPrimary}>
                    {t('screens.discover.priceDrop')}
                  </Text>
                </CornerTag>
              ) : null}
            </View>
            <View style={styles.body}>
              <View>
                <Text weight="600" numberOfLines={2}>
                  {p.title}
                </Text>
                <Text size="sm" muted>
                  {p.brand}
                </Text>
              </View>
              <StarRow rating={p.rating}>
                <Text size="sm" muted>{`${p.rating} (${fmt(p.reviews)})`}</Text>
              </StarRow>
              <View style={styles.list}>
                <View style={styles.between}>
                  <Text size="xs" muted>
                    {t('screens.discover.savedSaveddate', { savedDate: p.savedDate })}
                  </Text>
                  <Text size="xs" color={p.stock === 'In Stock' ? colors.statusSuccess : colors.statusWarning}>
                    {p.stock}
                  </Text>
                </View>
                {p.priceChange < 0 ? (
                  <Text size="xs" weight="600" color={colors.statusSuccess}>
                    {t('screens.discover.priceDroppedValue0', { value0: Math.abs(p.priceChange).toFixed(2) })}
                  </Text>
                ) : null}
                {p.priceChange === 0 ? (
                  <Text size="xs" muted>
                    {t('screens.discover.samePrice')}
                  </Text>
                ) : null}
              </View>
              <View style={styles.baseline}>
                <Text size="2xl" weight="700" color={p.priceChange < 0 ? colors.statusSuccess : undefined}>{`$${p.price}`}</Text>
                {p.priceChange < 0 ? (
                  <Text size="sm" muted style={styles.strike}>{`$${p.originalPrice}`}</Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Button style={styles.flex} testID={`deals-saved-add-${p.id}`}>
                  {t('screens.discover.addCart')}
                </Button>
                <Button variant="outline" size="icon" accessibilityLabel={p.title} testID={`deals-saved-package-${p.id}`}>
                  <DiscoverIcon name="Package" size={16} color={colors.foreground} />
                </Button>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  } else {
    content = (
      <View style={styles.stack} testID="deals-flash">
        {flashDeals.length === 0 ? (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: alpha(colors.card, 0.7), borderColor: colors.border }]} testID="deals-flash-empty">
            <DiscoverIcon name="Flame" size={40} color={colors.statusError} />
            <Text weight="600" style={styles.center}>
              {t('screens.discover.noFlashDealsRightNow')}
            </Text>
            <Text size="sm" muted style={styles.center}>
              {t('screens.discover.whenMerchantsRunPromotionsTheyRsquo')}
            </Text>
          </View>
        ) : null}
        {flashDeals.map((d) => (
          <Pressable key={d.id} testID={`deal-${d.id}`} accessibilityRole="button" accessibilityLabel={d.title} onPress={() => selectProduct(d._product)} style={card}>
            <BookmarkButton item={{ item_type: 'product', item_id: d.id, item_name: d.title, item_image_url: d.image ?? undefined, item_metadata: { provider: d.provider, price: d.price, originalPrice: d.originalPrice, discount: d.discount, category: d.category } }} />
            <View>
              <ProductImage src={d.image} alt={d.title} category={d.category} style={styles.media} />
              <CornerTag tone={colors.statusError}>
                <Text size="sm" weight="700" color={onPrimary}>
                  {t('screens.discover.discountOff', { discount: d.discount })}
                </Text>
              </CornerTag>
            </View>
            <View style={styles.body}>
              <View>
                <Text weight="600" numberOfLines={2}>
                  {d.title}
                </Text>
                <Text size="sm" muted>
                  {d.provider}
                </Text>
              </View>
              <StarRow rating={d.rating}>
                <Text size="sm" muted>{`${d.rating} (${fmt(d.reviews)})`}</Text>
              </StarRow>
              <View style={styles.baseline}>
                <Text size="2xl" weight="700" color={colors.statusError}>{`$${d.price}`}</Text>
                <Text size="sm" muted style={styles.strike}>{`$${d.originalPrice}`}</Text>
                <Text size="sm" weight="600" color={colors.statusSuccess} style={styles.pushEnd}>
                  {t('screens.discover.saveValue0', { value0: d.originalPrice - d.price })}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button style={styles.flex} testID={`deal-view-${d.id}`} onPress={() => selectProduct(d._product)}>
                  {t('screens.discover.viewDeal')}
                </Button>
                <AddToCartButton
                  item={{ item_type: 'product', item_id: d.id, item_name: d.title, item_price: d.price, item_image_url: d.image ?? undefined, item_metadata: { originalPrice: d.originalPrice, discount: d.discount, provider: d.provider } }}
                  variant="outline"
                  size="icon"
                />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SubCatalogueFrame
      testID="screen-discover-deals"
      path="/discover/deals-offers"
      title={t('screens.discover.dealsOffers')}
      searchPlaceholder={t('screens.discover.searchDealsOffers')}
      actionKind="shop"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setTab}
      overlays={<ProductDetailsDrawer />}
    >
      {content}
    </SubCatalogueFrame>
  );
}

export function DealsOffersScreen(): ReactElement {
  return (
    <ProductSelectionProvider>
      <DealsInner />
    </ProductSelectionProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 24 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  emptyCard: { alignItems: 'center', padding: 32, gap: 4 },
  center: { textAlign: 'center' },
  media: { width: '100%', height: 192 },
  body: { padding: 16, gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  pushEnd: { marginStart: 'auto' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, padding: 12 },
  list: { gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cornerTag: { position: 'absolute', top: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  tagEnd: { end: 48 },
  tagStart: { start: 8 },
});
