/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/discover/wellness-services`
 * (DISCOVER.WELLNESS_SERVICES, allowGuest), the phone branch of
 * src/pages/discover/WellnessServices.tsx (`WellnessServicesLegacy`):
 * SubNavigation · header · rail (Search · Calendar · + Action → quick book
 * actions · Life Compass · Gift Voucher · Refresh) · All Categories /
 * Recommended / Bookmarked (n).
 *
 *  - All Categories: the eight vertical cards (bookmark, tinted icon, name,
 *    count, description, "Featured services" bullets, "Explore <name>");
 *  - Recommended: the first six as AI cards (92 − 2·i %), "Explore services";
 *  - Bookmarked: loading / the empty card ("Explore services" → categories) /
 *    the bookmarked cards with the remove control and "Explore <name>";
 *  - the category sheet (from the end edge): icon, title, description,
 *    "Available services" + count, one card per service (badge, description,
 *    duration, price, rating, Vitana impact, provider, "Book now", add to cart).
 *
 * iOS IAP gate flag (R5): add-to-cart purchase surface — today's behaviour
 * (no iOS gate on add-to-cart; `iapRestricted`, shell/logic/drawer.ts:37-38,
 * unchanged); deferred decision. Like the web, a `wellness_service` item is
 * not a cart product, so its add-to-cart answers with the "failed" toast.
 */
import { useState, type ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, useTonePalette, useToneColor } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { AddToCartButton } from './AddToCartButton';
import { BookmarkButton } from './BookmarkButton';
import { SubCatalogueFrame } from './SubCatalogueFrame';
import { useBookmarks } from './data/bookmarks';
import { CATEGORY_SERVICES, WELLNESS_CATEGORIES, type WellnessCategory } from './wellness-data';

export function WellnessServicesScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const tone = useTonePalette();
  const violet = useToneColor('category-2');
  const [activeTab, setActiveTab] = useState('categories');
  const { getBookmarksByType, removeBookmark, isLoading: bookmarksLoading } = useBookmarks();
  const [selected, setSelected] = useState<WellnessCategory | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const bookmarked = getBookmarksByType('wellness_service');
  const openCategory = (c: WellnessCategory) => {
    setSelected(c);
    setDrawerOpen(true);
  };

  const tabs = [
    { value: 'categories', label: t('screens.discover.allCategories') },
    { value: 'recommended', label: t('screens.discover.recommended') },
    { value: 'bookmarked', label: t('screens.discover.bookmarkedValue0', { value0: bookmarked.length > 0 ? `(${bookmarked.length})` : '' }) },
  ];

  let content: ReactElement;
  if (activeTab === 'categories') {
    content = (
      <View style={styles.stack} testID="wellness-categories">
        {WELLNESS_CATEGORIES.map((c) => (
          <View key={c.id} style={[styles.card, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID={`wellness-category-${c.id}`}>
            <BookmarkButton item={{ item_type: 'wellness_service', item_id: String(c.id), item_name: t(c.nameKey), item_metadata: { description: t(c.descKey), featured: c.featuredKeys.map((k) => t(k)) } }} />
            <View style={styles.cardBody}>
              <View style={styles.headRow}>
                <View style={[styles.iconBox, { backgroundColor: tone(c.tone) }]}>
                  <DiscoverIcon name={c.icon} size={20} color={colors.primaryForeground} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.titleRow}>
                    <Text size="sm" weight="600" style={styles.flex}>
                      {t(c.nameKey)}
                    </Text>
                    <Badge variant="secondary">{String(c.count)}</Badge>
                  </View>
                  <Text size="xs" muted>
                    {t(c.descKey)}
                  </Text>
                </View>
              </View>
              <View style={styles.featured}>
                <Text size="xs" weight="500" muted>
                  {t('screens.discover.featuredServices')}
                </Text>
                {c.featuredKeys.map((k) => (
                  <View key={k} style={styles.bulletRow}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text size="xs" muted>
                      {t(k)}
                    </Text>
                  </View>
                ))}
              </View>
              <Button size="sm" testID={`wellness-explore-${c.id}`} onPress={() => openCategory(c)}>
                {t('screens.discover.exploreName', { name: t(c.nameKey) })}
              </Button>
            </View>
          </View>
        ))}
      </View>
    );
  } else if (activeTab === 'recommended') {
    content = (
      <View style={[styles.panel, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID="wellness-recommended">
        <View style={styles.bulletRow}>
          <DiscoverIcon name="Brain" size={24} color={violet} />
          <Text size="2xl" weight="600" style={styles.flex}>
            {t('screens.discover.airecommendedServices')}
          </Text>
        </View>
        <Text muted>{t('screens.discover.personalizedWellnessServiceRecommendationsBasedYou')}</Text>
        {WELLNESS_CATEGORIES.slice(0, 6).map((c, i) => (
          <View key={c.id} style={[styles.card, styles.cardBody, { borderColor: alpha(violet, 0.25), backgroundColor: colors.card }]}>
            <View style={styles.headRow}>
              <View style={[styles.iconBoxSmall, { backgroundColor: tone(c.tone) }]}>
                <DiscoverIcon name={c.icon} size={20} color={colors.primaryForeground} />
              </View>
              <View style={styles.flex}>
                <View style={styles.titleRow}>
                  <Text size="sm" weight="600" style={styles.flex}>
                    {t(c.nameKey)}
                  </Text>
                  <View style={[styles.matchPill, { backgroundColor: colors.card }]}>
                    <Text size="xs" weight="700" color={violet}>{`${92 - i * 2}%`}</Text>
                  </View>
                </View>
                <Text size="xs" muted>
                  {t(c.descKey)}
                </Text>
              </View>
            </View>
            <View style={[styles.reason, { backgroundColor: alpha(violet, 0.1) }]}>
              <DiscoverIcon name="Sparkles" size={12} color={violet} />
              <Text size="xs" color={violet}>
                {t('screens.discover.basedYourHealthGoals')}
              </Text>
            </View>
            <Button size="sm" testID={`wellness-recommended-${c.id}`} onPress={() => openCategory(c)}>
              {t('screens.discover.exploreServices')}
            </Button>
          </View>
        ))}
      </View>
    );
  } else if (bookmarksLoading) {
    content = (
      <Text muted style={styles.empty}>
        {t('screens.discover.loadingBookmarks')}
      </Text>
    );
  } else if (bookmarked.length === 0) {
    content = (
      <View style={[styles.panel, styles.centerBox, { backgroundColor: alpha(colors.card, 0.8), borderColor: alpha(colors.border, 0.2) }]} testID="wellness-bookmarks-empty">
        <DiscoverIcon name="Bookmark" size={64} color={colors.statusWarning} />
        <Text size="xl" weight="600" style={styles.centerText}>
          {t('screens.discover.noBookmarkedServicesYet')}
        </Text>
        <Text muted style={styles.centerText}>
          {t('screens.discover.browseWellnessServicesBookmarkYourFavorites')}
        </Text>
        <Button testID="wellness-bookmarks-explore" onPress={() => setActiveTab('categories')}>
          {t('screens.discover.exploreServices')}
        </Button>
      </View>
    );
  } else {
    content = (
      <View style={styles.stack} testID="wellness-bookmarks">
        {bookmarked.map((b) => (
          <View key={b.id} style={[styles.card, styles.cardBody, { backgroundColor: alpha(colors.card, 0.9), borderColor: colors.border }]}>
            <Pressable
              testID={`wellness-unbookmark-${b.item_id}`}
              accessibilityRole="button"
              accessibilityLabel={t('discoverCommerceNative.bookmark.remove')}
              onPress={() => void removeBookmark('wellness_service', b.item_id)}
              style={[styles.unbookmark, { backgroundColor: alpha(colors.statusWarning, 0.8) }]}
            >
              <DiscoverIcon name="Bookmark" size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
            </Pressable>
            <Text size="lg" weight="600">
              {b.item_name}
            </Text>
            {b.item_metadata?.description ? (
              <Text size="sm" muted>
                {String(b.item_metadata.description)}
              </Text>
            ) : null}
            <Button
              size="sm"
              testID={`wellness-bookmark-explore-${b.item_id}`}
              onPress={() => {
                const match = WELLNESS_CATEGORIES.find((c) => t(c.nameKey) === b.item_name);
                if (match) openCategory(match);
              }}
            >
              {t('screens.discover.exploreItem_name', { item_name: b.item_name })}
            </Button>
          </View>
        ))}
      </View>
    );
  }

  const services = selected ? CATEGORY_SERVICES[selected.id] ?? [] : [];
  const sheet = (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="end" testID="wellness-category-sheet">
        {selected ? (
          <ScrollView contentContainerStyle={styles.sheetBody}>
            <SheetHeader>
              <View style={styles.headRow}>
                <View style={[styles.iconBoxLarge, { backgroundColor: tone(selected.tone) }]}>
                  <DiscoverIcon name={selected.icon} size={24} color={colors.primaryForeground} />
                </View>
                <View style={styles.flex}>
                  <SheetTitle>{t(selected.nameKey)}</SheetTitle>
                  <SheetDescription>{t(selected.descKey)}</SheetDescription>
                </View>
              </View>
            </SheetHeader>
            <View style={styles.titleRow}>
              <Text size="lg" weight="600">
                {t('screens.discover.availableServices')}
              </Text>
              <Badge variant="secondary">{t('screens.discover.value0Services', { value0: services.length })}</Badge>
            </View>
            {services.map((s) => (
              <View key={s.id} style={[styles.card, styles.cardBody, { borderColor: colors.border, backgroundColor: colors.card }]} testID={`wellness-service-${s.id}`}>
                <View style={styles.headRow}>
                  <View style={[styles.iconBoxSmall, { backgroundColor: alpha(colors.primary, 0.1) }]}>
                    <DiscoverIcon name={s.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.titleRow}>
                      <Text weight="600" style={styles.flex}>
                        {s.title}
                      </Text>
                      {s.badge ? <Badge variant="secondary">{s.badge}</Badge> : null}
                    </View>
                    <Text size="sm" muted>
                      {s.description}
                    </Text>
                    <View style={styles.metaGrid}>
                      <Meta icon="Clock" text={s.duration} />
                      <Meta icon="DollarSign" text={`$${s.price}`} />
                      <Meta icon="Star" text={t('screens.discover.ratingRating', { rating: s.rating })} />
                      <Meta icon="Sparkles" text={t('screens.discover.vitanaimpactVitana', { vitanaImpact: s.vitanaImpact })} accent />
                    </View>
                    <Meta icon="MapPin" text={t('screens.discover.providerProvider', { provider: s.provider })} />
                    <View style={styles.actions}>
                      <Button size="sm" style={styles.flex} testID={`wellness-book-${s.id}`}>
                        {t('screens.discover.bookNow')}
                      </Button>
                      <AddToCartButton
                        item={{ item_type: 'wellness_service', item_id: s.id, item_name: s.title, item_price: s.price, item_metadata: { duration: s.duration, provider: s.provider, vitanaImpact: s.vitanaImpact } }}
                        size="sm"
                        style={styles.flex}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </SheetContent>
    </Sheet>
  );

  return (
    <SubCatalogueFrame
      testID="screen-discover-wellness"
      path="/discover/wellness-services"
      title={t('screens.discover.wellnessServices')}
      searchPlaceholder={t('screens.discover.searchWellnessServices')}
      actionKind="book"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      overlays={sheet}
    >
      {content}
    </SubCatalogueFrame>
  );
}

function Meta({ icon, text, accent }: { icon: string; text: string; accent?: boolean }): ReactElement {
  const { colors } = useUITheme();
  const tint = accent ? colors.primary : colors.mutedForeground;
  return (
    <View style={styles.meta}>
      <DiscoverIcon name={icon} size={14} color={tint} />
      <Text size="xs" weight={accent ? '500' : '400'} color={tint}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 24 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardBody: { padding: 16, gap: 12 },
  panel: { borderRadius: 12, borderWidth: 1, padding: 24, gap: 16 },
  centerBox: { alignItems: 'center', padding: 48, gap: 12 },
  centerText: { textAlign: 'center' },
  empty: { textAlign: 'center', paddingVertical: 48 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  iconBox: { padding: 8, borderRadius: 8 },
  iconBoxSmall: { padding: 8, borderRadius: 8 },
  iconBoxLarge: { padding: 12, borderRadius: 8 },
  featured: { gap: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  matchPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, padding: 8 },
  unbookmark: { position: 'absolute', top: 8, end: 8, zIndex: 10, padding: 8, borderRadius: 999 },
  sheetBody: { padding: 16, gap: 16 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, marginVertical: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '50%' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
