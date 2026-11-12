/**
 * VTID-05510 — twins of the premium Discover product cards
 * (src/components/discover/PremiumProductCard.tsx + ProductListRow.tsx):
 *  - `FeaturedProductCard`: full-width hero, badge, bookmark + recommend
 *    corners, title / brand, the violet reason strip, EUR price and the
 *    "View product" affiliate pill (surface `feed`);
 *  - `CompactProductCard`: the 168 pt card of the horizontal collections;
 *  - `ProductListRow`: the dense "See all" row (surface `search`).
 * Pressing the card opens the product; the affiliate control opens the
 * gateway redirect in the system browser and does not open the card.
 */
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, formatPrice, useToneColor } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { BookmarkButton, RecommendButton } from './BookmarkButton';
import { openExternal, ProductImage } from './parts';
import { getRedirectUrl, type MarketplaceProduct } from './data/marketplace';
import type { BookmarkButtonItem } from './data/bookmarks';

interface PremiumCardProps {
  product: MarketplaceProduct;
  badgeText: string;
  reasonText: string;
  onPress?: () => void;
}

export function bookmarkItem(product: MarketplaceProduct): BookmarkButtonItem {
  return {
    item_type: 'supplement',
    item_id: product.id,
    item_name: product.title,
    item_image_url: product.images?.[0],
    item_metadata: { brand: product.brand, category: product.subcategory },
  };
}

export function FeaturedProductCard({ product, badgeText, reasonText, onPress }: PremiumCardProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  return (
    <Pressable
      testID={`featured-card-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={product.title}
      onPress={onPress}
      style={[styles.featured, { backgroundColor: colors.card, borderColor: alpha(colors.border, 0.4) }]}
    >
      <View style={styles.featuredMedia}>
        <ProductImage src={product.images?.[0]} alt={product.title} category={product.category} subcategory={product.subcategory} style={styles.fill} />
        <View style={[styles.featuredBadge, { backgroundColor: alpha(colors.card, 0.95) }]}>
          <DiscoverIcon name="Sparkles" size={12} color={violet} />
          <Text size="xs" weight="600" color={violet}>
            {badgeText}
          </Text>
        </View>
        <BookmarkButton item={bookmarkItem(product)} />
        <RecommendButton productId={product.id} />
      </View>
      <View style={styles.featuredBody}>
        <View>
          <Text size="lg" weight="600" numberOfLines={2}>
            {product.title}
          </Text>
          {product.brand ? (
            <Text size="sm" muted>
              {product.brand}
            </Text>
          ) : null}
        </View>
        <View style={[styles.reason, { backgroundColor: alpha(violet, 0.1) }]}>
          <DiscoverIcon name="Sparkles" size={14} color={violet} />
          <Text size="sm" weight="500" color={violet} style={styles.flex}>
            {reasonText}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text size="xl" weight="700">
            {formatPrice(product.price_cents, product.currency)}
          </Text>
          <Pressable
            testID={`view-product-${product.id}`}
            accessibilityRole="link"
            accessibilityLabel={t('discover.viewProduct')}
            onPress={() => openExternal(getRedirectUrl(product.id, 'feed'))}
            style={[styles.viewPill, { backgroundColor: violet }]}
          >
            <Text size="sm" weight="600" color={colors.primaryForeground}>
              {t('discover.viewProduct')}
            </Text>
            <DiscoverIcon name="ExternalLink" size={14} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function CompactProductCard({ product, badgeText, reasonText, onPress }: PremiumCardProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  return (
    <Pressable
      testID={`compact-card-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={product.title}
      onPress={onPress}
      style={({ pressed }) => [styles.compact, { backgroundColor: colors.card, borderColor: alpha(colors.border, 0.4) }, pressed ? styles.pressed : null]}
    >
      <View style={styles.compactMedia}>
        <ProductImage src={product.images?.[0]} alt={product.title} category={product.category} subcategory={product.subcategory} style={styles.fill} />
        <BookmarkButton item={bookmarkItem(product)} size={28} />
        <RecommendButton productId={product.id} size={28} />
      </View>
      <View style={styles.compactBody}>
        <View style={[styles.smallBadge, { backgroundColor: alpha(violet, 0.1) }]}>
          <DiscoverIcon name="Sparkles" size={10} color={violet} />
          <Text weight="600" color={violet} style={styles.tiny}>
            {badgeText}
          </Text>
        </View>
        <Text size="sm" weight="500" numberOfLines={2} style={styles.compactTitle}>
          {product.title}
        </Text>
        {product.brand ? (
          <Text muted numberOfLines={1} style={styles.brandSmall}>
            {product.brand}
          </Text>
        ) : null}
        <Text size="xs" muted numberOfLines={1}>
          {reasonText}
        </Text>
        <View style={[styles.priceRow, styles.pushDown]}>
          <Text size="sm" weight="600">
            {formatPrice(product.price_cents, product.currency)}
          </Text>
          <Pressable
            testID={`view-product-${product.id}`}
            accessibilityRole="link"
            accessibilityLabel={t('discover.viewProduct')}
            onPress={() => openExternal(getRedirectUrl(product.id, 'feed'))}
            style={[styles.viewIcon, { backgroundColor: alpha(violet, 0.15) }]}
          >
            <DiscoverIcon name="ExternalLink" size={14} color={violet} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function ProductListRow({ product, badgeText, reasonText, onPress }: PremiumCardProps): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const violet = useToneColor('category-2');
  return (
    <Pressable
      testID={`list-row-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={product.title}
      onPress={onPress}
      style={({ pressed }) => [styles.listRow, { backgroundColor: colors.card, borderColor: alpha(colors.border, 0.4) }, pressed ? styles.pressedRow : null]}
    >
      <View style={styles.listMedia}>
        <ProductImage src={product.images?.[0]} alt={product.title} category={product.category} subcategory={product.subcategory} style={styles.fill} />
        <BookmarkButton item={bookmarkItem(product)} size={20} />
        <RecommendButton productId={product.id} size={20} />
      </View>
      <View style={styles.listBody}>
        <View>
          <View style={[styles.smallBadge, { backgroundColor: alpha(violet, 0.1), marginBottom: 4 }]}>
            <DiscoverIcon name="Sparkles" size={10} color={violet} />
            <Text weight="600" color={violet} style={styles.tiny}>
              {badgeText}
            </Text>
          </View>
          <Text size="sm" weight="500" numberOfLines={1}>
            {product.title}
          </Text>
          {product.brand ? (
            <Text muted numberOfLines={1} style={styles.brandSmall}>
              {product.brand}
            </Text>
          ) : null}
          <Text size="xs" muted numberOfLines={1}>
            {reasonText}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text size="sm" weight="600">
            {formatPrice(product.price_cents, product.currency)}
          </Text>
          <Pressable
            testID={`view-product-${product.id}`}
            accessibilityRole="link"
            accessibilityLabel={t('discover.viewProduct')}
            onPress={() => openExternal(getRedirectUrl(product.id, 'search'))}
            style={[styles.viewPillSmall, { backgroundColor: violet }]}
          >
            <Text size="xs" weight="600" color={colors.primaryForeground}>
              {t('discover.viewProduct')}
            </Text>
            <DiscoverIcon name="ExternalLink" size={12} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  featured: { borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  featuredMedia: { height: 224 },
  featuredBadge: { position: 'absolute', top: 12, start: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  featuredBody: { padding: 16, gap: 12 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  viewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  compact: { width: 168, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  pressed: { transform: [{ scale: 0.97 }] },
  pressedRow: { transform: [{ scale: 0.99 }] },
  compactMedia: { height: 124 },
  compactBody: { flex: 1, padding: 10, gap: 6 },
  smallBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  tiny: { fontSize: 10 },
  compactTitle: { minHeight: 40 },
  brandSmall: { fontSize: 11 },
  pushDown: { marginTop: 'auto' },
  viewIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listRow: { flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, padding: 10 },
  listMedia: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden' },
  listBody: { flex: 1, justifyContent: 'space-between', paddingVertical: 2 },
  viewPillSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
