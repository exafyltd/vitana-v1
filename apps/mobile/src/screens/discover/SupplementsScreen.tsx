/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover/supplements`
 * (DISCOVER.SUPPLEMENTS, allowGuest), src/pages/discover/Supplements.tsx as a
 * phone renders it (the legacy `SupplementsInner`, Spotlight is desktop-only):
 * SubNavigation · header · rail (Search · Calendar · + Action → quick shop
 * actions · Life Compass · Gift Voucher · Refresh) · Browse All / Top Picks /
 * My Stack.
 *
 *  - Browse All: "Filter & Search" (search text, category select — initial
 *    value from `?category=` — and sort select) driving
 *    `GET /discover/search?category=supplements&q&subcategory&sort&limit=48`
 *    (popular → relevance, rating, price-low → price_asc, price-high →
 *    price_desc); loading / "no supplements found" / the single-column grid of
 *    cards (bookmark, image, out-of-stock badge, category, name, brand,
 *    description, two benefit badges + "+N", rating, `$price`, add to cart);
 *    the hidden-by-preferences footer and the affiliate disclosure;
 *  - Top Picks: the first six as AI-pick cards (match 95 − 3·i %);
 *  - My Stack: the bookmarked supplements, or the "no saved supplements" card.
 * A card press opens the product drawer.
 *
 * iOS IAP gate flag (R5): add-to-cart purchase surface — today's behaviour
 * (no iOS gate on add-to-cart; `iapRestricted`, shell/logic/drawer.ts:37-38,
 * unchanged); deferred decision. The gift voucher stays hidden on iOS.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, useToneColor } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { AddToCartButton } from './AddToCartButton';
import { BookmarkButton } from './BookmarkButton';
import { HiddenByLimitationsFooter } from './chrome';
import { AffiliateDisclosure, ProductImage, StarRow, useFmtNumber } from './parts';
import { ProductDetailsDrawer, ProductSelectionProvider, useProductSelection } from './ProductDetailsDrawer';
import { SubCatalogueFrame } from './SubCatalogueFrame';
import { useBookmarks, type BookmarkButtonItem } from './data/bookmarks';
import { useMarketplaceSearch, type MarketplaceProduct, type MarketplaceSearchParams } from './data/marketplace';

interface Supplement {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  category: string;
  price: number;
  benefits: string[] | null;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
  in_stock: boolean | null;
}

/** Supplements.tsx `categories` (values verbatim; labels from discoverCommerceNative.supplementCategories.*). */
export const SUPPLEMENT_CATEGORIES: ReadonlyArray<{ value: string; key: string }> = [
  { value: 'all', key: 'all' },
  { value: 'multivitamins', key: 'multivitamins' },
  { value: 'vitamins', key: 'vitamins' },
  { value: 'minerals', key: 'minerals' },
  { value: 'essential-fatty-acids', key: 'omega3' },
  { value: 'adaptogens', key: 'adaptogens' },
  { value: 'nootropics', key: 'nootropics' },
  { value: 'longevity', key: 'longevity' },
  { value: 'immunity', key: 'immunity' },
  { value: 'antioxidants', key: 'antioxidants' },
  { value: 'sleep', key: 'sleep' },
  { value: 'performance', key: 'performance' },
  { value: 'beauty', key: 'beauty' },
  { value: 'gut-health', key: 'gutHealth' },
  { value: 'herbs', key: 'herbs' },
  { value: 'heart-health', key: 'heartHealth' },
];

const SORT_MAP: Record<string, MarketplaceSearchParams['sort']> = { popular: 'relevance', rating: 'rating', 'price-low': 'price_asc', 'price-high': 'price_desc' };

export function supplementSearchParams(searchQuery: string, selectedCategory: string, sortBy: string): MarketplaceSearchParams {
  return {
    category: 'supplements',
    q: searchQuery || undefined,
    subcategory: selectedCategory !== 'all' ? selectedCategory : undefined,
    sort: SORT_MAP[sortBy] ?? 'relevance',
    limit: 48,
  };
}

function toSupplement(p: MarketplaceProduct): Supplement {
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  return {
    id: p.id,
    name: p.title,
    brand: p.brand,
    description: p.description,
    category: p.subcategory ?? p.category ?? 'supplements',
    price: p.price_cents != null ? p.price_cents / 100 : 0,
    benefits: goals.length > 0 ? goals : null,
    image_url: Array.isArray(p.images) ? p.images[0] ?? null : null,
    rating: p.rating,
    review_count: p.review_count,
    in_stock: p.availability === 'in_stock',
  };
}

const bookmarkOf = (s: Supplement): BookmarkButtonItem => ({
  item_type: 'supplement',
  item_id: s.id,
  item_name: s.name,
  item_image_url: s.image_url || undefined,
  item_metadata: { brand: s.brand, category: s.category, price: s.price, benefits: s.benefits, rating: s.rating },
});

function SupplementCard({ s, onPress, variant }: { s: Supplement; onPress?: () => void; variant: 'browse' | 'stack' }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFmtNumber();
  const benefits = s.benefits ?? [];
  return (
    <Pressable testID={`supplement-card-${s.id}`} accessibilityRole="button" accessibilityLabel={s.name} onPress={onPress} style={[styles.card, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]}>
      <BookmarkButton item={bookmarkOf(s)} />
      <View>
        <ProductImage src={s.image_url} alt={s.name} category={s.category} style={styles.image192} />
        {!s.in_stock ? (
          <View style={[styles.cornerBadge, { backgroundColor: colors.statusError }]}>
            <Text size="xs" weight="600" color={colors.primaryForeground}>
              {t('screens.discover.outStock')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Badge variant="secondary" style={styles.selfStart}>
          {s.category}
        </Badge>
        <Text weight="600" numberOfLines={2}>
          {s.name}
        </Text>
        {variant === 'stack' || s.brand ? (
          <Text size={variant === 'stack' ? 'sm' : 'xs'} muted>
            {s.brand ?? ''}
          </Text>
        ) : null}
        <Text size="sm" muted numberOfLines={2}>
          {s.description ?? ''}
        </Text>
        {benefits.length > 0 ? (
          <View style={styles.wrap}>
            {benefits.slice(0, variant === 'stack' ? 3 : 2).map((b, i) => (
              <Badge key={i} variant="outline">
                {b}
              </Badge>
            ))}
            {variant === 'browse' && benefits.length > 2 ? <Badge variant="outline">{`+${benefits.length - 2}`}</Badge> : null}
          </View>
        ) : null}
        {variant === 'browse' ? (
          <View style={styles.inline}>
            <DiscoverIcon name="Star" size={16} color={colors.statusWarning} fill={colors.statusWarning} />
            <Text size="sm" weight="500">
              {s.rating?.toFixed(1) || '0.0'}
            </Text>
            <Text size="xs" muted>{`(${s.review_count || 0})`}</Text>
          </View>
        ) : (
          <StarRow rating={s.rating ?? 0}>
            <Text size="sm" muted>{`${s.rating ?? ''} (${fmt(s.review_count)})`}</Text>
          </StarRow>
        )}
        <View style={styles.priceRow}>
          <Text size={variant === 'browse' ? 'lg' : 'xl'} weight="700" color={variant === 'stack' ? colors.primary : undefined}>
            {variant === 'browse' ? `$${s.price?.toFixed(2)}` : `$${s.price}`}
          </Text>
          <AddToCartButton
            item={{ item_type: 'product', item_id: s.id, item_name: s.name, item_price: s.price, item_image_url: s.image_url || undefined, item_metadata: { brand: s.brand, category: s.category } }}
            size="sm"
            style={variant === 'browse' ? styles.flex : undefined}
          />
        </View>
      </View>
    </Pressable>
  );
}

function PickCard({ s, index, onPress }: { s: Supplement; index: number; onPress: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  return (
    <Pressable testID={`supplement-pick-${s.id}`} accessibilityRole="button" accessibilityLabel={s.name} onPress={onPress} style={[styles.card, { backgroundColor: colors.card, borderColor: alpha(violet, 0.25) }]}>
      <View>
        <ProductImage src={s.image_url} alt={s.name} category={s.category} style={styles.image128} />
        <View style={[styles.matchBadge, { backgroundColor: alpha(colors.card, 0.9) }]}>
          <Text size="xs" weight="700" color={violet}>{`${95 - index * 3}%`}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Badge variant="secondary" style={styles.selfStart}>
          {s.category}
        </Badge>
        <Text size="sm" weight="600" numberOfLines={2}>
          {s.name}
        </Text>
        <Text size="xs" muted numberOfLines={2}>
          {s.description ?? ''}
        </Text>
        <View style={[styles.reason, { backgroundColor: alpha(violet, 0.1) }]}>
          <DiscoverIcon name="Sparkles" size={12} color={violet} />
          <Text size="xs" color={violet}>
            {t('screens.discover.greatForYourHealthGoals')}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text size="lg" weight="700" color={colors.primary}>{`$${s.price}`}</Text>
          <AddToCartButton item={{ item_type: 'product', item_id: s.id, item_name: s.name, item_price: s.price, item_image_url: s.image_url, item_metadata: { brand: s.brand, category: s.category } }} size="sm" />
        </View>
      </View>
    </Pressable>
  );
}

function SupplementsInner(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  const params = useLocalSearchParams<{ category?: string }>();
  const { getBookmarksByType } = useBookmarks();
  const { selectProduct } = useProductSelection();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(() => params.category ?? 'all');
  const [sortBy, setSortBy] = useState('popular');

  const searchParams = useMemo(() => supplementSearchParams(searchQuery, selectedCategory, sortBy), [searchQuery, selectedCategory, sortBy]);
  const { data: searchData, isLoading: loading } = useMarketplaceSearch(searchParams);
  const productsById = useMemo(() => new Map((searchData?.items ?? []).map((p) => [p.id, p] as const)), [searchData]);
  const supplements = useMemo(() => (searchData?.items ?? []).map(toSupplement), [searchData]);
  const open = (id: string) => {
    const p = productsById.get(id);
    if (p) selectProduct(p);
  };

  const tabs = [
    { value: 'browse', label: t('screens.discover.browseAll') },
    { value: 'picks', label: t('screens.discover.topPicks') },
    { value: 'stack', label: t('screens.discover.myStack') },
  ];

  let content: ReactElement;
  if (activeTab === 'browse') {
    content = (
      <View style={styles.stack}>
        <View style={[styles.filters, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID="supplements-filters">
          <View style={styles.inline}>
            <DiscoverIcon name="Filter" size={20} color={colors.primary} />
            <Text size="lg" weight="600">
              {t('screens.discover.filterSearch')}
            </Text>
          </View>
          <Input testID="supplements-search" value={searchQuery} onChangeText={setSearchQuery} placeholder={t('screens.discover.searchSupplements2')} accessibilityLabel={t('screens.discover.searchSupplements2')} />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger testID="supplements-category" accessibilityLabel={t('screens.discover.category')}>
              <SelectValue placeholder={t('screens.discover.category')} />
            </SelectTrigger>
            <SelectContent>
              {SUPPLEMENT_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} testID={`supplements-category-${c.value}`}>
                  {t(`discoverCommerceNative.supplementCategories.${c.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger testID="supplements-sort" accessibilityLabel={t('screens.discover.sortBy')}>
              <SelectValue placeholder={t('screens.discover.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular" testID="supplements-sort-popular">{t('screens.discover.mostPopular')}</SelectItem>
              <SelectItem value="rating" testID="supplements-sort-rating">{t('screens.discover.highestRated')}</SelectItem>
              <SelectItem value="price-low" testID="supplements-sort-price-low">{t('screens.discover.priceLowHigh')}</SelectItem>
              <SelectItem value="price-high" testID="supplements-sort-price-high">{t('screens.discover.priceHighLow')}</SelectItem>
            </SelectContent>
          </Select>
        </View>
        {loading ? (
          <Text muted style={styles.empty} testID="supplements-loading">
            {t('screens.discover.loadingSupplements')}
          </Text>
        ) : supplements.length === 0 ? (
          <Text muted style={styles.empty} testID="supplements-empty">
            {t('screens.discover.noSupplementsFoundMatchingYourCriteria')}
          </Text>
        ) : (
          <View style={styles.stack} testID="supplements-grid">
            {supplements.map((s) => (
              <SupplementCard key={s.id} s={s} variant="browse" onPress={() => open(s.id)} />
            ))}
          </View>
        )}
        <HiddenByLimitationsFooter breakdown={searchData?.hidden_breakdown} />
        <AffiliateDisclosure style={styles.topGap} />
      </View>
    );
  } else if (activeTab === 'picks') {
    content = (
      <View style={[styles.panel, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID="supplements-picks">
        <View style={styles.inline}>
          <DiscoverIcon name="Brain" size={24} color={violet} />
          <Text size="2xl" weight="600">
            {t('screens.discover.aipoweredTopPicks')}
          </Text>
        </View>
        <Text muted>{t('screens.discover.personalizedSupplementRecommendationsBasedYourHeal')}</Text>
        <View style={styles.stack}>
          {supplements.slice(0, 6).map((s, i) => (
            <PickCard key={s.id} s={s} index={i} onPress={() => open(s.id)} />
          ))}
        </View>
      </View>
    );
  } else {
    const bookmarked = getBookmarksByType('supplement');
    const list = supplements.filter((s) => bookmarked.some((b) => b.item_id === s.id));
    content =
      list.length === 0 ? (
        <View style={[styles.panel, styles.centerBox, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID="supplements-stack-empty">
          <Text style={styles.bigEmoji}>💛</Text>
          <Text size="xl" weight="600" style={styles.centerText}>
            {t('screens.discover.noSavedSupplementsYet')}
          </Text>
          <Text muted style={styles.centerText}>
            {t('screens.discover.saveYourFavoriteSupplementsTrackYour')}
          </Text>
        </View>
      ) : (
        <View style={styles.stack} testID="supplements-stack">
          {list.map((s) => (
            <SupplementCard key={s.id} s={s} variant="stack" />
          ))}
        </View>
      );
  }

  return (
    <SubCatalogueFrame
      testID="screen-discover-supplements"
      path="/discover/supplements"
      title={t('screens.discover.supplements')}
      searchPlaceholder={t('screens.discover.searchSupplements')}
      actionKind="shop"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      overlays={<ProductDetailsDrawer />}
    >
      {content}
    </SubCatalogueFrame>
  );
}

export function SupplementsScreen(): ReactElement {
  return (
    <ProductSelectionProvider>
      <SupplementsInner />
    </ProductSelectionProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 24 },
  topGap: { marginTop: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  filters: { borderRadius: 16, borderWidth: 1, padding: 24, gap: 16 },
  panel: { borderRadius: 12, borderWidth: 1, padding: 24, gap: 16 },
  centerBox: { alignItems: 'center', padding: 48, gap: 8 },
  bigEmoji: { fontSize: 60, lineHeight: 72 },
  centerText: { textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 48 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardBody: { padding: 16, gap: 8 },
  selfStart: { alignSelf: 'flex-start' },
  image192: { width: '100%', height: 192 },
  image128: { width: '100%', height: 128 },
  cornerBadge: { position: 'absolute', top: 8, end: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  matchBadge: { position: 'absolute', top: 8, end: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, padding: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
});
