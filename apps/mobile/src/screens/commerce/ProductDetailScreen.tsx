/**
 * VTID-05512 (native-wave2-discover-commerce-r2/product-cart-checkout) —
 * `/discover/product/:id` (DISCOVER.PRODUCT_DETAIL), twin of the phone branch
 * of src/pages/discover/ProductDetail.tsx (Spotlight is desktop-only,
 * useSpotlightEnabled: `!isMobile && …`), one column (`md:` / `lg:` off):
 *
 *  - loading (:94-110): the pulse blocks;
 *  - not found / error (:112-131): "Product not found", the body, Go back ·
 *    Discover more;
 *  - loaded (:148-449): Back; the hero panel — image (h-80) with the
 *    availability badge, brand, title, rating + reviews · origin · subcategory,
 *    price + compare-at + "Save N %", the reward-points preview; the actions —
 *    the shared AddToCartButton (size lg) · Buy (affiliate redirect,
 *    `getRedirectUrl(id, 'product_detail', rec)`, external), Recommend & Earn
 *    (cta), Bookmark · Send in message · Share; then About this product, Key
 *    ingredients, Safety & interactions, Evidence, Directions (dose / serving /
 *    servings), Supports, Dietary, Why this for you; the separator, the
 *    informational disclaimer and the affiliate disclosure.
 *
 * `?rec=` is remembered per product for the session (data/product.ts) and
 * carried on the Buy redirect, like the web's sessionStorage.
 *
 * iOS IAP gate flags (requirements R5): the add-to-cart leg is a purchase
 * surface — today's behaviour, no iOS gate (the shared twin, drawer.ts:37-38
 * `iapRestricted` unchanged); the affiliate "Buy" is a real-world merchant
 * redirect (lower IAP risk) — recorded, nothing changed.
 */
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Badge, Button, Text, useUITheme } from '../../ports/ui';
import {
  AddToCartButton,
  AffiliateDisclosure,
  BookmarkButton,
  CheckoutIcon,
  formatPrice,
  getRedirectUrl,
  openExternal,
  ProductImage,
  productShareUrl,
  RecommendButton,
  SendInMessageButton,
  Separator,
  ShareButton,
  useFmtNumber,
} from '../../ports/commerce';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { goBack, Panel, PulseBlock } from './parts';
import { recommendationId, useMarketplaceProduct } from './data/product';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const human = (s: string) => s.replace(/_/g, ' ');

function Section({ icon, title, tone, children, testID, small = false }: { icon?: string; title: string; tone?: string; children: ReactNode; testID?: string; small?: boolean }): ReactElement {
  const { colors } = useUITheme();
  return (
    <Panel testID={testID}>
      <View style={styles.sectionBody}>
        <View style={styles.inline}>
          {icon ? <CheckoutIcon name={icon} size={small ? 16 : 20} color={tone ?? colors.mutedForeground} /> : null}
          <Text size={small ? 'base' : 'lg'} weight="600" color={tone} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </View>
    </Panel>
  );
}

export function ProductDetailScreen(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFmtNumber();
  const params = useLocalSearchParams<{ id?: string | string[]; rec?: string | string[] }>();
  const id = one(params.id);
  const { data, isLoading, error } = useMarketplaceProduct(id);
  const recId = recommendationId(id, one(params.rec) ?? null);

  if (isLoading) {
    return (
      <View style={styles.page} testID="product-detail-loading" accessibilityLabel={t('common.loading')}>
        <PulseBlock height={24} width={128} />
        <PulseBlock height={384} radius={12} />
        <PulseBlock height={32} width="66%" />
        <PulseBlock height={16} />
        <PulseBlock height={16} width="83%" />
      </View>
    );
  }

  if (error || !data?.ok || !data.product) {
    return (
      <View style={[styles.page, styles.center]} testID="product-not-found">
        <Panel style={styles.notFound}>
          <View style={styles.notFoundBody}>
            <Text size="xl" weight="600" accessibilityRole="header" style={styles.centerText}>
              {t('screens.discover.productNotFound')}
            </Text>
            <Text size="sm" muted style={styles.centerText}>
              {t('screens.discover.productYouRsquoReLookingFor')}
            </Text>
            <View style={styles.row}>
              <Button variant="outline" testID="product-go-back" onPress={() => goBack('/discover')}>
                {t('screens.discover.goBack')}
              </Button>
              <Button testID="product-discover-more" onPress={() => navigateToWebPath('/discover')}>
                {t('screens.discover.discoverMore')}
              </Button>
            </View>
          </View>
        </Panel>
      </View>
    );
  }

  const p = data.product;
  const hasDiscount = p.compare_at_price_cents != null && p.price_cents != null && p.compare_at_price_cents > p.price_cents;
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];
  const ingredients = Array.isArray(p.ingredients_primary) ? p.ingredients_primary : [];
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  const dietary = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
  const evidence = Array.isArray(p.evidence_links) ? p.evidence_links : [];
  const redirectUrl = getRedirectUrl(p.id, 'product_detail', recId);
  const image = p.images?.[0];

  return (
    <ScrollView contentContainerStyle={styles.page} testID="product-detail">
      <Button variant="ghost" size="sm" onPress={() => goBack('/discover')} style={styles.back} testID="product-back">
        <CheckoutIcon name="ArrowLeft" size={16} color={colors.foreground} />
        {t('screens.discover.back')}
      </Button>

      <Panel>
        <View>
          <ProductImage src={image ?? null} alt={p.title} category={p.category} subcategory={p.subcategory} style={styles.hero} />
          {p.availability && p.availability !== 'in_stock' ? (
            <View style={[styles.availability, { backgroundColor: colors.statusError }]} testID="product-availability">
              <Text size="xs" weight="600" color={colors.primaryForeground}>
                {p.availability === 'out_of_stock' ? t('discoverCommerceNative.product.outOfStock') : p.availability}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.summary}>
          <View style={styles.gap12}>
            {p.brand ? (
              <Text size="xs" muted style={styles.upper}>
                {p.brand}
              </Text>
            ) : null}
            <Text size="2xl" weight="600" accessibilityRole="header">
              {p.title}
            </Text>
            <View style={styles.meta}>
              {p.rating != null && p.rating > 0 ? (
                <View style={styles.inline}>
                  <CheckoutIcon name="Star" size={16} color={colors.statusWarning} fill={colors.statusWarning} />
                  <Text size="sm" weight="500">
                    {p.rating.toFixed(1)}
                  </Text>
                  {p.review_count ? (
                    <Text size="sm" muted>
                      {t('screens.discover.value0Reviews', { value0: fmt(p.review_count) })}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {p.origin_country ? (
                <View style={styles.inline}>
                  <CheckoutIcon name="MapPin" size={14} color={colors.mutedForeground} />
                  <Text size="sm" muted>
                    {p.origin_country}
                  </Text>
                </View>
              ) : null}
              {p.subcategory ? <Badge variant="secondary">{p.subcategory}</Badge> : null}
            </View>
            <View style={styles.price}>
              <Text size="2xl" weight="700" testID="product-price">
                {formatPrice(p.price_cents, p.currency)}
              </Text>
              {hasDiscount ? (
                <>
                  <Text muted style={styles.strike}>
                    {formatPrice(p.compare_at_price_cents, p.currency)}
                  </Text>
                  <Badge variant="destructive" testID="product-discount">
                    {t('screens.discover.saveValue02', { value0: Math.round((1 - (p.price_cents ?? 0) / (p.compare_at_price_cents ?? 1)) * 100) })}
                  </Badge>
                </>
              ) : null}
            </View>
            {p.reward_preview?.points_estimate ? (
              <View style={styles.inline} testID="product-reward">
                <CheckoutIcon name="Gift" size={16} color={colors.statusSuccess} />
                <Text size="sm" color={colors.statusSuccess}>
                  {t('screens.discover.earnPoints_estimatePointsPurchase', { points_estimate: p.reward_preview.points_estimate })}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            <View style={styles.row}>
              <View style={styles.cartSlot}>
                <AddToCartButton
                  item={{
                    item_type: 'product',
                    item_id: p.id,
                    item_name: p.title,
                    item_price: p.price_cents ? p.price_cents / 100 : 0,
                    item_image_url: image,
                    item_metadata: { brand: p.brand, category: p.category },
                  }}
                  size="lg"
                />
              </View>
              <Button variant="outline" size="lg" testID="product-buy" accessibilityRole="link" onPress={() => openExternal(redirectUrl)}>
                {t('screens.discover.buy')}
                <CheckoutIcon name="ExternalLink" size={16} color={colors.foreground} />
              </Button>
            </View>
            <RecommendButton productId={p.id} variant="cta" />
            <View style={styles.wrap}>
              <View style={styles.bookmarkSlot}>
                <BookmarkButton
                  item={{ item_type: 'product', item_id: p.id, item_name: p.title, item_image_url: image, item_metadata: { brand: p.brand, category: p.category } }}
                  size={40}
                />
              </View>
              <SendInMessageButton item={{ kind: 'product', id: p.id }} itemTitle={p.title} />
              <ShareButton variant="outline" size="icon" showLabel={false} content={{ title: p.title, description: p.description ?? '', url: productShareUrl(p.id) }} testID="product-share" />
            </View>
          </View>
        </View>
      </Panel>

      {p.description_long || p.description ? (
        <Section title={t('screens.discover.aboutThisProduct')} testID="product-about">
          <Text size="sm" muted style={styles.relaxed}>
            {p.description_long || p.description}
          </Text>
        </Section>
      ) : null}

      {ingredients.length > 0 ? (
        <Section icon="Leaf" title={t('screens.discover.keyIngredients')} testID="product-ingredients">
          {ingredients.map((ing) => (
            <View key={ing} style={styles.bullet}>
              <Text size="sm" muted>
                •
              </Text>
              <Text size="sm" muted style={styles.capitalize}>
                {human(ing)}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {p.safety_notes ? (
        <View style={[styles.tinted, { backgroundColor: colors.statusWarningSubtle, borderColor: colors.statusWarning }]} testID="product-safety">
          <View style={styles.inline}>
            <CheckoutIcon name="AlertTriangle" size={20} color={colors.statusWarning} />
            <Text size="lg" weight="600" color={colors.statusWarning} accessibilityRole="header">
              {t('screens.discover.safetyAmpInteractions')}
            </Text>
          </View>
          <Text size="sm" color={colors.statusWarning} style={styles.relaxed}>
            {p.safety_notes}
          </Text>
        </View>
      ) : null}

      {evidence.length > 0 ? (
        <Section icon="BookOpen" title={t('screens.discover.evidence')} testID="product-evidence">
          {evidence.map((e, i) =>
            e.url ? (
              <View key={i} style={styles.bullet}>
                <Text size="sm" muted>
                  •
                </Text>
                <View style={styles.evidence}>
                  <Text size="sm" color={colors.primary} accessibilityRole="link" onPress={() => openExternal(e.url as string)} testID={`product-evidence-${i}`}>
                    {e.title ?? e.url}
                  </Text>
                  {e.source_type ? (
                    <Badge variant="outline">
                      <Text weight="600" style={styles.tiny}>
                        {human(e.source_type)}
                      </Text>
                    </Badge>
                  ) : null}
                </View>
              </View>
            ) : null,
          )}
        </Section>
      ) : null}

      {p.dosage || p.serving_size || p.servings_per_container ? (
        <Section icon="ClipboardList" title={t('screens.discover.directions')} small testID="product-directions">
          <View style={styles.grid3}>
            {p.dosage ? <Direction label={t('screens.discover.dose')} value={p.dosage} /> : null}
            {p.serving_size ? <Direction label={t('screens.discover.serving')} value={p.serving_size} /> : null}
            {p.servings_per_container != null ? <Direction label={t('screens.discover.servings')} value={String(p.servings_per_container)} /> : null}
          </View>
        </Section>
      ) : null}

      {goals.length > 0 ? (
        <Section icon="Target" title={t('screens.discover.supports')} small testID="product-supports">
          <View style={styles.wrap6}>
            {goals.map((g) => (
              <Badge key={g} variant="secondary">
                <Text size="xs" weight="600" color={colors.secondaryForeground} style={styles.capitalize}>
                  {human(g)}
                </Text>
              </Badge>
            ))}
          </View>
        </Section>
      ) : null}

      {dietary.length > 0 ? (
        <Section icon="ShieldCheck" title={t('screens.discover.dietary')} small testID="product-dietary">
          <View style={styles.wrap6}>
            {dietary.map((d) => (
              <Badge key={d} variant="outline">
                <Text size="xs" weight="600" style={styles.capitalize}>
                  {human(d)}
                </Text>
              </Badge>
            ))}
          </View>
        </Section>
      ) : null}

      {matchReasons.length > 0 ? (
        <View style={[styles.tinted, { backgroundColor: colors.statusSuccessSubtle, borderColor: colors.statusSuccess }]} testID="product-why">
          <Text weight="600" color={colors.statusSuccess} accessibilityRole="header">
            {t('screens.discover.whyThisForYou')}
          </Text>
          {matchReasons.map((r, i) => (
            <View key={i} style={styles.bullet}>
              <Text size="sm" color={colors.statusSuccess}>
                •
              </Text>
              <Text size="sm" color={colors.statusSuccess} style={styles.flex}>
                {r.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Separator />
      <View style={styles.gap8}>
        <Text size="xs" muted style={styles.relaxed}>
          {t('screens.discover.thisProductCardInformationalAlwaysConsult2')}
        </Text>
        <AffiliateDisclosure />
      </View>
    </ScrollView>
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

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 128, gap: 24 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  notFound: { maxWidth: 448, width: '100%' },
  notFoundBody: { padding: 32, gap: 16, alignItems: 'center' },
  back: { alignSelf: 'flex-start', marginStart: -8 },
  hero: { width: '100%', height: 320, borderTopStartRadius: 8, borderTopEndRadius: 8 },
  availability: { position: 'absolute', top: 12, end: 12, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  summary: { padding: 24, gap: 16 },
  gap12: { gap: 12 },
  gap8: { gap: 8 },
  upper: { textTransform: 'uppercase', letterSpacing: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  price: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  strike: { textDecorationLine: 'line-through' },
  actions: { gap: 8, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  cartSlot: { flex: 1, minWidth: 160 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bookmarkSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sectionBody: { padding: 24, gap: 12 },
  relaxed: { lineHeight: 22 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  capitalize: { textTransform: 'capitalize' },
  evidence: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tiny: { fontSize: 10, textTransform: 'capitalize' },
  tinted: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, padding: 24, gap: 8 },
  grid3: { flexDirection: 'row', gap: 8 },
  direction: { flex: 1, borderRadius: 6, padding: 8, gap: 2 },
  tinyUpper: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  wrap6: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flex: { flex: 1 },
});
