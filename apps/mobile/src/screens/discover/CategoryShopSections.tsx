/**
 * VTID-05510 — twin of src/components/discover/CategoryShopSections.tsx: the
 * thematic collections of one Discover category. One search
 * (`category`, sort `rating`, limit FETCH_LIMIT = 50) grouped by subcategory in
 * the SECTION_CONFIGS order (generated from the web file), ≤ 6 products each;
 * a section header (tinted icon + name + "See all" → /discover/category/:key)
 * over a horizontal row of compact cards. Loading: three pulsing blocks;
 * nothing to show: "No results".
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, FETCH_LIMIT, ITEMS_PER_SECTION, SECTION_CONFIGS, toneForGradient, useTonePalette } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { useMarketplaceSearch, type MarketplaceProduct } from './data/marketplace';
import { CompactProductCard } from './ProductCards';
import { badgeFor, getPersonalizedReason } from './reason';

export function PulseBlock({ height, radius = 20, testID }: { height: number; radius?: number; testID?: string }): ReactElement {
  const { colors } = useUITheme();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View testID={testID} style={{ height, borderRadius: radius, backgroundColor: alpha(colors.muted, 0.4), opacity }} />;
}

export function CategoryShopSections({ category = 'supplements', title }: { category?: string; title?: string }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const sectionOrder = SECTION_CONFIGS[category] ?? [];
  const { data, isLoading } = useMarketplaceSearch({ category, sort: 'rating', limit: FETCH_LIMIT });

  const bySubcategory = new Map<string, MarketplaceProduct[]>();
  for (const p of data?.items ?? []) {
    const key = p.subcategory ?? '';
    if (!key) continue;
    const list = bySubcategory.get(key) ?? [];
    if (list.length < ITEMS_PER_SECTION) list.push(p);
    bySubcategory.set(key, list);
  }
  const sections = sectionOrder.map((meta) => ({ meta, products: bySubcategory.get(meta.key) ?? [] })).filter((s) => s.products.length > 0);
  const heading = title ? (
    <Text weight="600" accessibilityRole="header">
      {title}
    </Text>
  ) : null;

  if (isLoading) {
    return (
      <View style={styles.stack} testID={`shop-sections-loading-${category}`}>
        {heading}
        {Array.from({ length: 3 }).map((_, i) => (
          <PulseBlock key={i} height={160} />
        ))}
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.stack} testID={`shop-sections-empty-${category}`}>
        {heading}
        <Text size="sm" muted style={styles.empty}>
          {t('discover.noResults')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.sections} testID={`shop-sections-${category}`}>
      {heading}
      {sections.map(({ meta, products }) => {
        const tint = tone(toneForGradient(meta.gradient));
        return (
          <View key={meta.key} style={styles.section} testID={`shop-section-${meta.key}`}>
            <View style={styles.header}>
              <View style={styles.headerLead}>
                <View style={[styles.iconBox, { backgroundColor: tint }]}>
                  <DiscoverIcon name={meta.icon} size={14} color={colors.primaryForeground} />
                </View>
                <Text size="sm" weight="600">
                  {t(`discover.subcategories.${meta.i18nKey}`)}
                </Text>
              </View>
              <Button variant="ghost" size="sm" testID={`see-all-${meta.key}`} onPress={() => navigateToWebPath(`/discover/category/${meta.key}`)} style={styles.seeAll}>
                <Text size="xs" muted>
                  {t('discover.seeAll')}
                </Text>
                <DiscoverIcon name="ChevronRight" size={12} color={colors.mutedForeground} />
              </Button>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} snapToAlignment="start" decelerationRate="fast">
              {products.map((product) => (
                <CompactProductCard
                  key={product.id}
                  product={product}
                  badgeText={badgeFor(product, t)}
                  reasonText={getPersonalizedReason(product, t)}
                  onPress={() => navigateToWebPath(`/discover/product/${product.id}`)}
                />
              ))}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  sections: { gap: 20 },
  section: { gap: 8 },
  empty: { textAlign: 'center', paddingVertical: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  seeAll: { height: 28, paddingHorizontal: 8, gap: 2 },
  row: { gap: 12, paddingBottom: 4 },
});
