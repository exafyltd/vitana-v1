/**
 * VTID-05510 — twin of src/components/discover/ProductDetailsDrawer.tsx (the
 * mobile `Drawer` branch, max 92 % of the screen) and the
 * `ProductSelectionContext` that opens it. A card calls `selectProduct(p)`;
 * the drawer renders the product body: hero + availability badge, brand,
 * title, rating / origin / subcategory, "Open full page" (→ /discover/product/:id),
 * price + compare-at, the reward-points line, "Why this for you", the
 * description, Supports / Key ingredients / Dietary, Directions (dose,
 * serving, servings), Safety & interactions, Evidence links, the disclaimer
 * and the compact affiliate disclosure; then the sticky action bar:
 * AddToCart · Buy (affiliate redirect, surface `product_detail`) · Recommend &
 * Earn · Send in message · Share.
 *
 * iOS IAP gate flag (R5): add-to-cart purchase surface — today's behaviour
 * (no iOS gate on add-to-cart; `iapRestricted` in shell/logic/drawer.ts:37-38
 * unchanged).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import { DiscoverIcon, Drawer, DrawerContent, formatPrice, Separator } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { AddToCartButton } from './AddToCartButton';
import { RecommendButton } from './BookmarkButton';
import { AffiliateDisclosure, openExternal, ProductImage, useFmtNumber } from './parts';
import { SendInMessageButton } from './SendInMessageSheet';
import { productShareUrl, ShareButton } from './ShareButton';
import { getRedirectUrl, type MarketplaceProduct } from './data/marketplace';

type Selection = { selectedProduct: MarketplaceProduct | null; selectProduct: (p: MarketplaceProduct) => void; clearSelection: () => void };
const ProductSelectionContext = createContext<Selection | null>(null);

export function ProductSelectionProvider({ children }: { children: ReactNode }): ReactElement {
  const [selectedProduct, setSelected] = useState<MarketplaceProduct | null>(null);
  const selectProduct = useCallback((p: MarketplaceProduct) => setSelected(p), []);
  const clearSelection = useCallback(() => setSelected(null), []);
  const value = useMemo(() => ({ selectedProduct, selectProduct, clearSelection }), [selectedProduct, selectProduct, clearSelection]);
  return <ProductSelectionContext.Provider value={value}>{children}</ProductSelectionContext.Provider>;
}

export function useProductSelection(): Selection {
  const ctx = useContext(ProductSelectionContext);
  if (!ctx) throw new Error('useProductSelection must be used inside <ProductSelectionProvider>');
  return ctx;
}

const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Section({ icon, title, children, tone }: { icon?: string; title: string; children: ReactNode; tone?: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        {icon ? <DiscoverIcon name={icon} size={16} color={tone ?? colors.mutedForeground} /> : null}
        <Text size="sm" weight="600" color={tone}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function ProductDetailsBody({ product: p, onClose }: { product: MarketplaceProduct; onClose: () => void }): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFmtNumber();
  const hasDiscount = !!(p.compare_at_price_cents && p.price_cents && p.compare_at_price_cents > p.price_cents);
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];
  const ingredients = Array.isArray(p.ingredients_primary) ? p.ingredients_primary : [];
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  const dietary = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
  // The web reads a ?rec= id from sessionStorage (`vitana.rec.<id>`), written
  // by the product page when a recommend link was opened this session; the
  // native product page (product-cart-checkout lane) has not written one, so
  // the redirect carries no rec id here.
  const redirectUrl = getRedirectUrl(p.id, 'product_detail', null);

  return (
    <View style={styles.body} testID="product-details">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View>
          <ProductImage src={p.images?.[0]} alt={p.title} category={p.category} subcategory={p.subcategory} style={styles.hero} />
          {p.availability && p.availability !== 'in_stock' ? (
            <View style={[styles.availability, { backgroundColor: colors.statusError }]}>
              <Text size="xs" weight="600" color={colors.primaryForeground}>
                {p.availability === 'out_of_stock' ? t('discoverCommerceNative.product.outOfStock') : p.availability}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.content}>
          <View>
            {p.brand ? (
              <Text size="xs" muted style={styles.upper}>
                {p.brand}
              </Text>
            ) : null}
            <Text size="xl" weight="600">
              {p.title}
            </Text>
            <View style={styles.metaRow}>
              {p.rating !== null && p.rating > 0 ? (
                <View style={styles.inline}>
                  <DiscoverIcon name="Star" size={16} color={colors.statusWarning} fill={colors.statusWarning} />
                  <Text size="sm" weight="500">
                    {p.rating.toFixed(1)}
                  </Text>
                  {p.review_count ? (
                    <Text size="sm" muted>
                      {`(${fmt(p.review_count)})`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {p.origin_country ? (
                <View style={styles.inline}>
                  <DiscoverIcon name="MapPin" size={14} color={colors.mutedForeground} />
                  <Text size="sm" muted>
                    {p.origin_country}
                  </Text>
                </View>
              ) : null}
              {p.subcategory ? <Badge variant="secondary">{p.subcategory}</Badge> : null}
              <Button
                variant="link"
                size="xs"
                testID="product-open-full-page"
                onPress={() => {
                  onClose();
                  navigateToWebPath(`/discover/product/${p.id}`);
                }}
                style={styles.pushEnd}
              >
                <Text size="xs" color={colors.primary}>
                  {t('screens.discover.openFullPage')}
                </Text>
                <DiscoverIcon name="ExternalLink" size={12} color={colors.primary} />
              </Button>
            </View>
          </View>

          <View>
            <View style={styles.inlineBaseline}>
              <Text size="2xl" weight="700">
                {formatPrice(p.price_cents, p.currency)}
              </Text>
              {hasDiscount ? (
                <Text size="sm" muted style={styles.strike}>
                  {formatPrice(p.compare_at_price_cents, p.currency)}
                </Text>
              ) : null}
            </View>
            {p.reward_preview?.points_estimate ? (
              <View style={styles.inline}>
                <DiscoverIcon name="Gift" size={14} color={colors.statusSuccess} />
                <Text size="xs" color={colors.statusSuccess}>
                  {t('screens.discover.earnPoints_estimatePointsPurchase', { points_estimate: p.reward_preview.points_estimate })}
                </Text>
              </View>
            ) : null}
          </View>

          {matchReasons.length > 0 ? (
            <View style={[styles.box, { backgroundColor: colors.statusSuccessSubtle }]} testID="product-match-reasons">
              <Section icon="Sparkles" title={t('screens.discover.whyThisForYou')} tone={colors.statusSuccess}>
                {matchReasons.slice(0, 5).map((r, i) => (
                  <Text key={i} size="sm" color={colors.statusSuccess}>
                    {`• ${r.text}`}
                  </Text>
                ))}
              </Section>
            </View>
          ) : null}

          {p.description_long || p.description ? (
            <Section title={t('screens.discover.aboutThisProduct')}>
              <Text size="sm" muted>
                {p.description_long || p.description}
              </Text>
            </Section>
          ) : null}

          {goals.length > 0 ? (
            <Section icon="Target" title={t('screens.discover.supports')}>
              <View style={styles.wrap}>
                {goals.map((g) => (
                  <Badge key={g} variant="secondary">
                    {humanize(g)}
                  </Badge>
                ))}
              </View>
            </Section>
          ) : null}

          {ingredients.length > 0 ? (
            <Section icon="Leaf" title={t('screens.discover.keyIngredients')}>
              {ingredients.map((ing) => (
                <Text key={ing} size="sm" muted>
                  {`• ${humanize(ing)}`}
                </Text>
              ))}
            </Section>
          ) : null}

          {dietary.length > 0 ? (
            <Section icon="ShieldCheck" title={t('screens.discover.dietary')}>
              <View style={styles.wrap}>
                {dietary.map((d) => (
                  <Badge key={d} variant="outline">
                    {humanize(d)}
                  </Badge>
                ))}
              </View>
            </Section>
          ) : null}

          {p.dosage || p.serving_size || p.servings_per_container ? (
            <Section icon="ClipboardList" title={t('screens.discover.directions')}>
              <View style={styles.grid3}>
                {p.dosage ? <Direction label={t('screens.discover.dose')} value={p.dosage} /> : null}
                {p.serving_size ? <Direction label={t('screens.discover.serving')} value={p.serving_size} /> : null}
                {p.servings_per_container != null ? <Direction label={t('screens.discover.servings')} value={String(p.servings_per_container)} /> : null}
              </View>
            </Section>
          ) : null}

          {p.safety_notes ? (
            <View style={[styles.box, { backgroundColor: colors.statusWarningSubtle, borderColor: colors.statusWarning, borderWidth: StyleSheet.hairlineWidth }]}>
              <Section icon="AlertTriangle" title={t('screens.discover.safetyAmpInteractions')} tone={colors.statusWarning}>
                <Text size="sm" color={colors.statusWarning}>
                  {p.safety_notes}
                </Text>
              </Section>
            </View>
          ) : null}

          {Array.isArray(p.evidence_links) && p.evidence_links.length > 0 ? (
            <Section icon="BookOpen" title={t('screens.discover.evidence')}>
              {p.evidence_links.map((e, i) =>
                e.url ? (
                  <View key={i} style={styles.inlineWrap}>
                    <Text size="sm" color={colors.primary} accessibilityRole="link" onPress={() => openExternal(e.url as string)}>
                      {`• ${e.title ?? e.url}`}
                    </Text>
                    {e.source_type ? <Badge variant="outline">{humanize(e.source_type)}</Badge> : null}
                  </View>
                ) : null,
              )}
            </Section>
          ) : null}

          <Separator />
          <Text size="xs" muted>
            {t('screens.discover.thisProductCardInformationalAlwaysConsult')}
          </Text>
          <AffiliateDisclosure compact />
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.actions, { borderTopColor: colors.border, backgroundColor: colors.background }]} contentContainerStyle={styles.actionsRow}>
        <AddToCartButton
          item={{ item_type: 'product', item_id: p.id, item_name: p.title, item_price: p.price_cents ? p.price_cents / 100 : 0, item_image_url: p.images?.[0], item_metadata: { brand: p.brand, category: p.category } }}
          size="default"
        />
        <Button variant="outline" testID="product-buy" onPress={() => openExternal(redirectUrl)}>
          <Text size="sm" weight="500">
            {t('screens.discover.buy')}
          </Text>
          <DiscoverIcon name="ExternalLink" size={16} color={colors.foreground} />
        </Button>
        <RecommendButton productId={p.id} variant="cta" />
        <SendInMessageButton item={{ kind: 'product', id: p.id }} itemTitle={p.title} />
        <ShareButton variant="outline" size="default" showLabel={false} content={{ title: p.title, description: p.description ?? '', url: productShareUrl(p.id) }} testID="product-share" />
      </ScrollView>
    </View>
  );
}

function Direction({ label, value }: { label: string; value: string }): ReactElement {
  const { colors } = useUITheme();
  return (
    <View style={[styles.direction, { backgroundColor: colors.muted }]}>
      <Text muted style={styles.tinyUpper}>
        {label}
      </Text>
      <Text size="sm" weight="500">
        {value}
      </Text>
    </View>
  );
}

/** The drawer itself; open while a product is selected. */
export function ProductDetailsDrawer(): ReactElement {
  const { selectedProduct, clearSelection } = useProductSelection();
  return (
    <Drawer open={!!selectedProduct} onOpenChange={(v: boolean) => !v && clearSelection()}>
      <DrawerContent testID="product-details-drawer" style={styles.drawer}>
        {selectedProduct ? <ProductDetailsBody product={selectedProduct} onClose={clearSelection} /> : null}
      </DrawerContent>
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: { maxHeight: '92%' },
  body: { flexShrink: 1 },
  scroll: { paddingBottom: 16 },
  hero: { width: '100%', height: 256 },
  availability: { position: 'absolute', top: 12, end: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  content: { padding: 20, gap: 20 },
  upper: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  inlineBaseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
  pushEnd: { marginStart: 'auto' },
  box: { borderRadius: 8, padding: 16 },
  section: { gap: 8 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grid3: { flexDirection: 'row', gap: 8 },
  direction: { flex: 1, borderRadius: 6, padding: 8 },
  tinyUpper: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  actions: { flexGrow: 0, borderTopWidth: 1 },
  actionsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
});
