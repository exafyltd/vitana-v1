/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover/category/:subcategory`
 * (exclusion row, allowGuest), the phone branch of
 * src/pages/discover/CategoryProducts.tsx: the "See all" list of one
 * thematic collection. A sticky header (back, the tinted collection icon —
 * a package for an unknown key — the name, "N products found" once loaded)
 * over the vertical `ProductListRow` list; six pulsing rows while loading;
 * "No results" when empty. The search is
 * `GET /discover/search?category=<meta.category | supplements>&subcategory&sort=rating&limit=50`
 * (SECTION_META generated from the web file). A row opens the product page.
 * The web page renders no add-to-cart control (the rows link out), so this
 * screen carries no purchase surface of its own.
 */
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, SECTION_META, toneForGradient, useTonePalette } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { PulseBlock } from './CategoryShopSections';
import { ProductListRow } from './ProductCards';
import { badgeFor, getPersonalizedReason } from './reason';
import { useMarketplaceSearch } from './data/marketplace';

export function CategoryProductsScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const { subcategory = '' } = useLocalSearchParams<{ subcategory?: string }>();
  const meta = SECTION_META[subcategory];
  const { data, isLoading } = useMarketplaceSearch({ category: meta?.category ?? 'supplements', subcategory, sort: 'rating', limit: 50 });
  const products = data?.items ?? [];
  const title = meta ? t(`discover.subcategories.${meta.i18nKey}`) : subcategory;
  const tint = meta ? tone(toneForGradient(meta.gradient)) : tone('category-3');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-discover-category">
      <View style={[styles.header, { borderBottomColor: alpha(colors.border, 0.5), backgroundColor: alpha(colors.background, 0.95) }]}>
        <Pressable testID="category-back" accessibilityRole="button" accessibilityLabel={t('discover.back')} hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : navigateToWebPath('/discover'))} style={styles.back}>
          <DiscoverIcon name="ArrowLeft" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <DiscoverIcon name={meta ? meta.icon : 'Package'} size={16} color={colors.primaryForeground} />
        </View>
        <View style={styles.flex}>
          <Text weight="600" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {!isLoading ? (
            <Text size="xs" muted testID="category-count">
              {t('discover.productsFound').replace('{count}', String(products.length))}
            </Text>
          ) : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <PulseBlock key={i} height={96} radius={16} testID="category-skeleton" />)
        ) : products.length === 0 ? (
          <Text size="sm" muted style={styles.empty} testID="category-empty">
            {t('discover.noResults')}
          </Text>
        ) : (
          products.map((p) => (
            <ProductListRow key={p.id} product={p} badgeText={badgeFor(p, t)} reasonText={getPersonalizedReason(p, t)} onPress={() => navigateToWebPath(`/discover/product/${p.id}`)} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  back: { padding: 4, marginStart: -4 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96, gap: 10 },
  empty: { textAlign: 'center', paddingVertical: 64 },
});
