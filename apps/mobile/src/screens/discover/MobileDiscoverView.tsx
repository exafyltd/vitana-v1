/**
 * VTID-05510 — the ONE native twin of src/components/discover/MobileDiscoverView.tsx
 * (plan decision 3; exported through `src/ports/add-to-cart.ts`), the
 * mode-pill content of the mobile Discover page:
 *
 *  - `suggested` (Vitana Picks): the Vitana header row with "See all"
 *    (→ /discover/ai-picks, mapped natively to this tab, sparring R1-F1), the
 *    featured hero (first feed item), "More to explore" — a horizontal row of
 *    the remaining feed items — then the thematic collections for
 *    supplements, skincare and health tests;
 *  - `categories`: "Browse categories" with "All" (→ /discover/supplements),
 *    the same three collection groups, then the non-product categories (sleep,
 *    movement, mind, experts) as compact chips;
 *  - `share`: the Share & Earn call-to-action card ("Start" → /discover).
 *
 * Cards open the product by its real product id (`/discover/product/:id`).
 * The category chips come from MOBILE_DISCOVER_CATEGORIES (generated from the
 * web `categoryConfig`); their colours take the token of the gradient's hue.
 */
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, MOBILE_DISCOVER_CATEGORIES, toneForGradient, useTonePalette } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { CategoryShopSections } from './CategoryShopSections';
import { CompactProductCard, FeaturedProductCard } from './ProductCards';
import { badgeFor, getPersonalizedReason } from './reason';
import { VitanaOrbAvatar } from './VitanaOrbAvatar';
import type { MarketplaceProduct } from './data/marketplace';


export interface AIRecommendation {
  id: number;
  title: string;
  description: string;
  price: string;
  match: number;
  reason: string;
  provider: string;
  image: string;
  badge: string;
  _product?: MarketplaceProduct;
}

function openRecommendation(rec: AIRecommendation): void {
  const productId = rec._product?.id ?? String(rec.id);
  navigateToWebPath(`/discover/product/${productId}`);
}

export function MobileDiscoverView({ aiRecommendations, activeTab = 'suggested' }: { aiRecommendations: AIRecommendation[]; activeTab?: string }): ReactElement | null {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();

  if (activeTab === 'suggested') {
    const featured = aiRecommendations[0]?._product ? aiRecommendations[0] : undefined;
    const rest = aiRecommendations.slice(1).filter((rec) => rec._product);
    return (
      <View style={styles.stack6} testID="discover-tab-suggested">
        <View style={styles.headerRow}>
          <View style={styles.inline}>
            <VitanaOrbAvatar accessibilityLabel={t('screens.vitanaIdentity.orbAlt')} />
            <Text weight="600" accessibilityRole="header">
              {t('discover.recommendedForYou')}
            </Text>
          </View>
          <Button variant="ghost" size="sm" testID="discover-see-all-picks" onPress={() => navigateToWebPath('/discover/ai-picks')} style={styles.ghostSmall}>
            <Text size="xs" muted>
              {t('discover.seeAll')}
            </Text>
            <DiscoverIcon name="ChevronRight" size={12} color={colors.mutedForeground} />
          </Button>
        </View>

        {featured?._product ? (
          <FeaturedProductCard
            product={featured._product}
            badgeText={badgeFor(featured._product, t)}
            reasonText={getPersonalizedReason(featured._product, t)}
            onPress={() => openRecommendation(featured)}
          />
        ) : null}

        {rest.length > 0 ? (
          <View style={styles.stack2} testID="discover-more-to-explore">
            <View style={styles.inline}>
              <Text size="xs" weight="500" muted style={styles.upper}>
                {t('discover.moreToExplore')}
              </Text>
              <View style={[styles.rule, { backgroundColor: alpha(colors.border, 0.5) }]} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} decelerationRate="fast">
              {rest.map((rec) => (
                <CompactProductCard
                  key={rec.id}
                  product={rec._product as MarketplaceProduct}
                  badgeText={badgeFor(rec._product as MarketplaceProduct, t)}
                  reasonText={getPersonalizedReason(rec._product as MarketplaceProduct, t)}
                  onPress={() => openRecommendation(rec)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <CategoryShopSections />
        <CategoryShopSections category="skincare" title={t('discover.skincareCosmetics')} />
        <CategoryShopSections category="health-tests" title={t('discover.healthTests')} />
      </View>
    );
  }

  if (activeTab === 'categories') {
    const nonProduct = MOBILE_DISCOVER_CATEGORIES.filter((c) => c.id !== 'nutrition' && c.id !== 'supplements');
    return (
      <View style={styles.stack4} testID="discover-tab-categories">
        <View style={styles.headerRow}>
          <Text weight="600" accessibilityRole="header">
            {t('discover.browseCategories')}
          </Text>
          <Button variant="ghost" size="sm" testID="discover-all-categories" onPress={() => navigateToWebPath('/discover/supplements')} style={styles.ghostSmall}>
            <Text size="xs" muted>
              {t('discover.all')}
            </Text>
            <DiscoverIcon name="LayoutGrid" size={12} color={colors.mutedForeground} />
          </Button>
        </View>
        <CategoryShopSections />
        <CategoryShopSections category="skincare" title={t('discover.skincareCosmetics')} />
        <CategoryShopSections category="health-tests" title={t('discover.healthTests')} />
        <View style={styles.chips}>
          {nonProduct.map((category) => (
            <Pressable
              key={category.id}
              testID={`discover-category-chip-${category.id}`}
              accessibilityRole="button"
              onPress={() => navigateToWebPath(category.path)}
              style={({ pressed }) => [styles.chip, { backgroundColor: colors.card, borderColor: alpha(colors.border, 0.5) }, pressed ? styles.pressed : null]}
            >
              <View style={[styles.chipIcon, { backgroundColor: tone(toneForGradient(category.color)) }]}>
                <DiscoverIcon name={category.icon} size={12} color={colors.primaryForeground} />
              </View>
              <Text size="xs" weight="500">
                {t(`discover.categories.${category.id}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  if (activeTab === 'share') {
    const violet = tone('category-2');
    return (
      <View style={styles.stack3} testID="discover-tab-share">
        <View style={[styles.shareCard, { backgroundColor: alpha(violet, 0.1), borderColor: alpha(violet, 0.1) }]}>
          <View style={styles.shareHead}>
            <View style={[styles.shareIcon, { backgroundColor: violet }]}>
              <DiscoverIcon name="Sparkles" size={24} color={colors.primaryForeground} />
            </View>
            <View style={styles.flex}>
              <Text weight="600">{t('discover.shareAndEarn')}</Text>
              <Text size="xs" muted>
                {t('discover.shareAndEarnDesc')}
              </Text>
            </View>
          </View>
          <Button testID="discover-share-start" onPress={() => navigateToWebPath('/discover')} style={styles.shareButton}>
            {t('discover.start')}
          </Button>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack2: { gap: 8 },
  stack3: { gap: 12 },
  stack4: { gap: 16 },
  stack6: { gap: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ghostSmall: { height: 28, paddingHorizontal: 8, gap: 2 },
  upper: { textTransform: 'uppercase', letterSpacing: 1 },
  rule: { height: 1, flex: 1 },
  row: { gap: 12, paddingBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, paddingStart: 8, paddingEnd: 12, paddingVertical: 6 },
  chipIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.97 }] },
  shareCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shareIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  shareButton: { borderRadius: 12 },
});
