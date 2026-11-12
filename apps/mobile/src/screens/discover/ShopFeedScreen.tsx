/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — `/shop`
 * (DISCOVER.SHOP), the phone branch of src/pages/ShopFeed.tsx: the immersive,
 * full-screen, vertically snapping video-commerce feed (no in-screen chrome).
 *
 *  - one dark full-screen card per video (`<video>` → expo-video, contain,
 *    loop, muted by default): the bottom scrim, mute toggle, share, the
 *    two-line caption and the product anchor pill (thumb, label, badge price,
 *    bag icon);
 *  - autoplay while the card is ≥ 60 % on screen and no sheet is open, pause
 *    otherwise (paging FlatList viewability = the web IntersectionObserver
 *    0.6 threshold); one `impression` per card and `hold_2s` after 2 s of
 *    continuous play (HOLD_THRESHOLD_MS, generated from the web file);
 *  - anchor tap → `anchor_tap` + `drawer_open` and the peek drawer over the
 *    paused video: live anchor (`GET …/anchor`, staleTime 0) → loading
 *    skeleton / role-blocked / unavailable (404) / error + retry / the product
 *    (image, title, price + compare-at, rating, out-of-stock badge, compact
 *    affiliate line, "Add to cart" (or "Notify me" disabled when out of stock),
 *    "More details", "Go to cart" → /universal-cart); closing emits
 *    `drawer_close`;
 *  - "More details" → `drawer_expand` and the full product drawer
 *    (ProductDetailsDrawer, the shop product mapped to MarketplaceProduct);
 *  - add to cart: `add_to_cart` event, then `POST /universal-cart/items` with
 *    the video-shop attribution (`source_surface:'video_shop'`, source_ref /
 *    source_video_id = the video, source_creator_id, merchant_id, the live
 *    price + currency snapshots); "added" / "failed" toasts;
 *  - share: `share` event + the system share sheet with `/shop?v=<id>`;
 *  - infinite scroll (`onEndReached` = the sentinel), "loading more", "end";
 *  - feed states: role-blocked, loading (immersive skeleton), error + retry,
 *    empty + "Browse Discover".
 *
 * iOS IAP gate flag (R5): add-to-cart purchase surface — today's behaviour
 * (no iOS gate on add-to-cart; `iapRestricted`, shell/logic/drawer.ts:37-38,
 * unchanged); deferred decision.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { FlatList, Image, Pressable, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Badge, Button, Text, UIProvider, useUITheme } from '../../ports/ui';
import { alpha, DiscoverIcon, Drawer, DrawerContent, HOLD_THRESHOLD_MS, notify, notifyError, useToneColor } from '../../ports/discover';
import { useI18n } from '../../i18n/I18nProvider';
import { navigateToWebPath } from '../../navigation/navigate';
import { PulseBlock } from './CategoryShopSections';
import { ProductDetailsDrawer, ProductSelectionProvider, useProductSelection } from './ProductDetailsDrawer';
import { AffiliateDisclosure, ProductImage, useFmtNumber } from './parts';
import { shareContent } from './ShareButton';
import { useUniversalCart } from './data/cart';
import { publicWebOrigin } from './data/client';
import type { MarketplaceProduct } from './data/marketplace';
import { useShopEvents, useShopFeed, useShopVideoAnchor, type ShopAnchorLive, type ShopProduct, type VideoItem } from './data/shop';

/** web `priceLabel` (formatMoneyMinor in the member's language; USD stays USD, anything else EUR). */
export function priceLabel(cents: number | null, currency: string | null, language: string): string {
  if (cents == null) return '';
  const cur = (currency ?? 'EUR').toUpperCase();
  const safe = cur === 'USD' ? 'USD' : 'EUR';
  return new Intl.NumberFormat(language || 'de-DE', { style: 'currency', currency: safe }).format(cents / 100);
}

/** web `toMarketplaceProduct`: a shop product onto the shape the product drawer reads. */
export function toMarketplaceProduct(p: ShopProduct): MarketplaceProduct {
  const get = <T,>(k: string): T | undefined => p[k] as T | undefined;
  return {
    id: p.id,
    title: p.title ?? '',
    description: get<string>('description') ?? null,
    description_long: get<string>('description_long') ?? null,
    brand: get<string>('brand') ?? null,
    category: get<string>('category') ?? null,
    subcategory: get<string>('subcategory') ?? null,
    price_cents: p.price_cents,
    currency: p.currency,
    compare_at_price_cents: p.compare_at_price_cents,
    images: Array.isArray(p.images) ? p.images : [],
    affiliate_url: p.affiliate_url ?? '',
    availability: p.availability,
    rating: p.rating,
    review_count: p.review_count,
    origin_country: get<string>('origin_country') ?? null,
    origin_region: get<string>('origin_region') ?? null,
    merchant_id: p.merchant_id,
    ingredients_primary: get<string[]>('ingredients_primary') ?? [],
    health_goals: get<string[]>('health_goals') ?? [],
    dietary_tags: get<string[]>('dietary_tags') ?? [],
    reward_preview: get('reward_preview') ?? null,
    dosage: get<string>('dosage') ?? null,
    serving_size: get<string>('serving_size') ?? null,
    servings_per_container: get<number>('servings_per_container') ?? null,
    evidence_links: get('evidence_links') ?? [],
    safety_notes: get<string>('safety_notes') ?? null,
  };
}

/** The web `dark` class on the cards, the loader and the feed footer. */
function Dark({ children }: { children: ReactElement }): ReactElement {
  const { direction } = useUITheme();
  return (
    <UIProvider colorScheme="dark" direction={direction}>
      {children}
    </UIProvider>
  );
}

function VideoCard({
  video,
  height,
  onScreen,
  muted,
  onToggleMute,
  drawerOpen,
  onOpenAnchor,
  onShare,
  onImpression,
  onHold,
}: {
  video: VideoItem;
  height: number;
  onScreen: boolean;
  muted: boolean;
  onToggleMute: () => void;
  drawerOpen: boolean;
  onOpenAnchor: (video: VideoItem) => void;
  onShare: (video: VideoItem) => void;
  onImpression: (videoId: string) => void;
  onHold: (videoId: string) => void;
}): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const player = useVideoPlayer(video.playback.video_url, (p) => {
    p.loop = true;
    p.muted = true;
  });
  const impressed = useRef(false);
  const held = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    player.muted = muted;
    if (onScreen && !drawerOpen) {
      try {
        player.play();
      } catch {
        /* autoplay can be refused — ignore */
      }
      if (!impressed.current) {
        impressed.current = true;
        onImpression(video.id);
      }
      if (!held.current && !holdTimer.current) {
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          if (!held.current) {
            held.current = true;
            onHold(video.id);
          }
        }, HOLD_THRESHOLD_MS);
      }
    } else {
      player.pause();
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
    }
    return () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
    };
  }, [onScreen, drawerOpen, muted, video.id, onImpression, onHold, player]);

  const anchor = video.primary_anchor;
  const fg = colors.foreground;
  return (
    <View style={[styles.card, { height, backgroundColor: colors.background }]} testID={`shop-video-${video.id}`}>
      {video.playback.poster_url ? <Image source={{ uri: video.playback.poster_url }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : null}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} testID={`shop-video-player-${video.id}`} />
      <View pointerEvents="none" style={[styles.scrim, { backgroundColor: alpha(colors.background, 0.35) }]} />
      <Pressable
        testID={`shop-mute-${video.id}`}
        accessibilityRole="button"
        accessibilityLabel={muted ? t('videoShop.feed.unmute') : t('videoShop.feed.mute')}
        onPress={onToggleMute}
        style={[styles.iconButton, styles.mute]}
      >
        <DiscoverIcon name={muted ? 'VolumeX' : 'Volume2'} size={20} color={fg} />
      </Pressable>
      <Pressable testID={`shop-share-${video.id}`} accessibilityRole="button" accessibilityLabel={t('videoShop.feed.share')} onPress={() => onShare(video)} style={[styles.iconButton, styles.share]}>
        <DiscoverIcon name="Share2" size={20} color={fg} />
      </Pressable>
      {video.caption ? (
        <View style={styles.caption}>
          <Text size="sm" weight="500" numberOfLines={2}>
            {video.caption}
          </Text>
        </View>
      ) : null}
      {anchor ? (
        <Pressable
          testID={`shop-anchor-${video.id}`}
          accessibilityRole="button"
          accessibilityLabel={anchor.label}
          onPress={() => onOpenAnchor(video)}
          style={({ pressed }) => [styles.anchor, { backgroundColor: alpha(colors.card, 0.95) }, pressed ? { transform: [{ scale: 0.95 }] } : null]}
        >
          <View style={[styles.anchorThumb, { backgroundColor: colors.muted }]}>
            <ProductImage src={anchor.product.images?.[0]} alt={anchor.product.title ?? t('videoShop.drawer.productFallback')} style={styles.fill} />
          </View>
          <View style={styles.anchorText}>
            <Text size="sm" weight="600" numberOfLines={1}>
              {anchor.label}
            </Text>
            {anchor.badge_price_cents != null ? (
              <Text size="xs" weight="500" muted>
                {priceLabel(anchor.badge_price_cents, anchor.currency, language)}
              </Text>
            ) : null}
          </View>
          <DiscoverIcon name="ShoppingBag" size={16} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

function PeekDrawer({ video, open, onClose, onExpand }: { video: VideoItem | null; open: boolean; onClose: () => void; onExpand: (anchor: ShopAnchorLive) => void }): ReactElement {
  const { t, language } = useI18n();
  const { colors } = useUITheme();
  const fmt = useFmtNumber();
  const star = useToneColor('category-5');
  const { anchor, isLoading, unavailable, error, refetch } = useShopVideoAnchor(video?.id ?? null, { enabled: open && !!video });
  const { addItem, isAdding, roleBlocked } = useUniversalCart();
  const { emit } = useShopEvents();
  const product = anchor?.product;
  const inStock = product ? product.in_stock : false;

  const onAddToCart = useCallback(async () => {
    if (!video || !anchor || !product) return;
    emit(video.id, { type: 'add_to_cart', anchor_id: anchor.id, product_id: product.id });
    try {
      await addItem({
        product_id: product.id,
        item_type: 'partner_product',
        quantity: 1,
        source_surface: 'video_shop',
        source_ref: video.id,
        source_video_id: video.id,
        ...(video.creator_id ? { source_creator_id: video.creator_id } : {}),
        ...(product.merchant_id ? { merchant_id: product.merchant_id } : {}),
        ...(product.price_cents != null ? { unit_price_cents_snapshot: product.price_cents } : {}),
        ...(product.currency ? { currency_snapshot: product.currency } : {}),
      });
      notify('videoShop.drawer.addedTitle', 'videoShop.drawer.addedBody');
    } catch {
      notifyError('videoShop.drawer.addFailed');
    }
  }, [video, anchor, product, addItem, emit]);

  const title = product?.title ?? t('videoShop.drawer.productFallback');
  return (
    <Drawer open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DrawerContent testID="shop-peek-drawer" style={styles.peek} accessibilityLabel={title}>
        <View style={styles.peekBody}>
          {isLoading ? (
            <View style={styles.peekLoading} accessibilityState={{ busy: true }} testID="shop-peek-loading" accessibilityLabel={t('videoShop.drawer.loading')}>
              <PulseBlock height={64} radius={8} />
              <View style={styles.flexGap}>
                <PulseBlock height={16} radius={4} />
                <PulseBlock height={16} radius={4} />
              </View>
            </View>
          ) : null}
          {!isLoading && roleBlocked ? (
            <View style={styles.peekState} testID="shop-peek-role-blocked">
              <Text size="lg" weight="500" style={styles.center}>
                {t('videoShop.drawer.roleBlockedTitle')}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('videoShop.drawer.roleBlockedBody')}
              </Text>
            </View>
          ) : null}
          {!isLoading && unavailable ? (
            <View style={styles.peekState} testID="shop-peek-unavailable">
              <DiscoverIcon name="AlertTriangle" size={24} color={colors.statusWarning} />
              <Text size="lg" weight="500" style={styles.center}>
                {t('videoShop.drawer.unavailableTitle')}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('videoShop.drawer.unavailableBody')}
              </Text>
            </View>
          ) : null}
          {!isLoading && !unavailable && !roleBlocked && error ? (
            <View style={styles.peekState} testID="shop-peek-error">
              <Text size="lg" weight="500" style={styles.center}>
                {t('videoShop.drawer.errorTitle')}
              </Text>
              <Text size="sm" muted style={styles.center}>
                {t('videoShop.drawer.errorBody')}
              </Text>
              <Button variant="outline" size="sm" testID="shop-peek-retry" onPress={() => void refetch()}>
                {t('videoShop.drawer.retry')}
              </Button>
            </View>
          ) : null}
          {!isLoading && !unavailable && !roleBlocked && !error && product && anchor ? (
            <View style={styles.peekProduct} testID="shop-peek-product">
              <View style={styles.peekRow}>
                <View style={[styles.peekThumb, { backgroundColor: colors.muted }]}>
                  <ProductImage src={product.images?.[0]} alt={title} style={styles.fill} />
                </View>
                <View style={styles.flex}>
                  <Text size="lg" weight="600" accessibilityRole="header">
                    {title}
                  </Text>
                  <View style={styles.baseline}>
                    <Text size="xl" weight="700">
                      {priceLabel(product.price_cents, product.currency, language)}
                    </Text>
                    {product.compare_at_price_cents != null && product.price_cents != null && product.compare_at_price_cents > product.price_cents ? (
                      <Text size="sm" muted style={styles.strike}>
                        {priceLabel(product.compare_at_price_cents, product.currency, language)}
                      </Text>
                    ) : null}
                  </View>
                  {product.rating != null && product.rating > 0 ? (
                    <View style={styles.inline}>
                      <DiscoverIcon name="Star" size={16} color={star} fill={star} />
                      <Text size="sm" weight="500">
                        {fmt(product.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </Text>
                      {product.review_count ? (
                        <Text size="sm" muted>
                          {`(${fmt(product.review_count)})`}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {!inStock ? (
                    <Badge variant="secondary" style={styles.topGap}>
                      {t('videoShop.drawer.outOfStock')}
                    </Badge>
                  ) : null}
                </View>
              </View>
              <AffiliateDisclosure compact />
              <View style={styles.peekActions}>
                <View style={styles.peekRow}>
                  <Button size="lg" testID="shop-peek-add" disabled={isAdding || !inStock} onPress={() => void onAddToCart()} style={styles.flex}>
                    <DiscoverIcon name={isAdding ? 'Loader2' : 'ShoppingCart'} size={16} color={colors.primaryForeground} />
                    <Text size="sm" weight="500" color={colors.primaryForeground} style={{ marginStart: 8 }}>
                      {isAdding ? t('videoShop.drawer.adding') : inStock ? t('videoShop.drawer.addToCart') : t('videoShop.drawer.notifyMe')}
                    </Text>
                  </Button>
                  <Button size="lg" variant="outline" testID="shop-peek-more" onPress={() => onExpand(anchor)}>
                    {t('videoShop.drawer.moreDetails')}
                  </Button>
                </View>
                <Button variant="ghost" size="sm" testID="shop-peek-cart" onPress={() => navigateToWebPath('/universal-cart')}>
                  {t('videoShop.drawer.goToCart')}
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </DrawerContent>
    </Drawer>
  );
}

function ShopFeedInner(): ReactElement {
  const { t } = useI18n();
  const { colors } = useUITheme();
  const { height } = useWindowDimensions();
  const { videos, isLoading, isFetchingNextPage, hasNextPage, error, roleBlocked, fetchNextPage, refresh } = useShopFeed();
  const { emit, sessionId } = useShopEvents();
  const { selectProduct, selectedProduct } = useProductSelection();
  const [muted, setMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [visibleId, setVisibleId] = useState<string | null>(null);

  const expandedPdpOpen = !!selectedProduct;
  const peekOpen = !!activeVideo && !expandedPdpOpen;
  const anySheetOpen = peekOpen || expandedPdpOpen;

  useEffect(() => {
    if (!visibleId && videos.length > 0) setVisibleId(videos[0].id);
  }, [videos, visibleId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first) setVisibleId((first.item as VideoItem).id);
  }).current;

  const onImpression = useCallback((videoId: string) => emit(videoId, { type: 'impression', session_id: sessionId }), [emit, sessionId]);
  const onHold = useCallback((videoId: string) => emit(videoId, { type: 'hold_2s', session_id: sessionId }), [emit, sessionId]);

  const onOpenAnchor = useCallback(
    (video: VideoItem) => {
      setActiveVideo(video);
      if (video.primary_anchor) {
        emit(video.id, { type: 'anchor_tap', anchor_id: video.primary_anchor.id, product_id: video.primary_anchor.product.id });
        emit(video.id, { type: 'drawer_open', anchor_id: video.primary_anchor.id, product_id: video.primary_anchor.product.id });
      }
    },
    [emit],
  );

  const onClosePeek = useCallback(() => {
    if (activeVideo?.primary_anchor) emit(activeVideo.id, { type: 'drawer_close', anchor_id: activeVideo.primary_anchor.id });
    setActiveVideo(null);
  }, [activeVideo, emit]);

  const onExpand = useCallback(
    (anchor: ShopAnchorLive) => {
      if (activeVideo) emit(activeVideo.id, { type: 'drawer_expand', anchor_id: anchor.id, product_id: anchor.product.id });
      selectProduct(toMarketplaceProduct(anchor.product));
    },
    [activeVideo, emit, selectProduct],
  );

  const onShare = useCallback(
    async (video: VideoItem) => {
      emit(video.id, { type: 'share' });
      await shareContent({ title: video.title ?? '', url: `${publicWebOrigin()}/shop?v=${encodeURIComponent(video.id)}` });
    },
    [emit],
  );

  if (roleBlocked) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]} testID="shop-role-blocked">
        <Text size="xl" weight="600" accessibilityRole="header" style={styles.center}>
          {t('videoShop.feed.roleBlockedTitle')}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t('videoShop.feed.roleBlockedBody')}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <Dark>
      <View style={[styles.loading, { backgroundColor: colors.background }]} testID="shop-loading" accessibilityLabel={t('videoShop.feed.loading')} accessibilityState={{ busy: true }}>
        <PulseBlock height={height * 0.7} radius={0} />
        <View style={styles.loadingFoot}>
          <PulseBlock height={16} radius={4} />
          <PulseBlock height={40} radius={999} />
        </View>
      </View>
      </Dark>
    );
  }

  if (error && !roleBlocked) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]} testID="shop-error">
        <Text size="xl" weight="600" accessibilityRole="header" style={styles.center}>
          {t('videoShop.feed.errorTitle')}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t('videoShop.feed.errorBody')}
        </Text>
        <Button variant="outline" testID="shop-retry" onPress={() => void refresh()}>
          {t('videoShop.feed.retry')}
        </Button>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={[styles.state, { backgroundColor: colors.background }]} testID="shop-empty">
        <DiscoverIcon name="ShoppingBag" size={32} color={colors.mutedForeground} />
        <Text size="xl" weight="600" accessibilityRole="header" style={styles.center}>
          {t('videoShop.feed.emptyTitle')}
        </Text>
        <Text size="sm" muted style={styles.center}>
          {t('videoShop.feed.emptyBody')}
        </Text>
        <Button variant="outline" testID="shop-browse-discover" onPress={() => navigateToWebPath('/discover')} style={styles.topGap}>
          {t('videoShop.feed.browseDiscover')}
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} testID="screen-shop">
      <FlatList
        testID="shop-feed"
        data={videos}
        keyExtractor={(v) => v.id}
        pagingEnabled
        snapToInterval={height}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        renderItem={({ item }) => (
          <Dark>
          <VideoCard
            video={item}
            height={height}
            onScreen={item.id === visibleId}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            drawerOpen={anySheetOpen}
            onOpenAnchor={onOpenAnchor}
            onShare={(v) => void onShare(v)}
            onImpression={onImpression}
            onHold={onHold}
          />
          </Dark>
        )}
        ListFooterComponent={
          <Dark>
          <>
            {isFetchingNextPage ? (
              <View style={styles.footer} testID="shop-loading-more">
                <DiscoverIcon name="Loader2" size={16} color={alpha(colors.foreground, 0.8)} />
                <Text size="sm" color={alpha(colors.foreground, 0.8)}>
                  {t('videoShop.feed.loadingMore')}
                </Text>
              </View>
            ) : null}
            {!hasNextPage ? (
              <View style={styles.footer} testID="shop-end">
                <Text size="sm" color={alpha(colors.foreground, 0.6)}>
                  {t('videoShop.feed.end')}
                </Text>
              </View>
            ) : null}
          </>
          </Dark>
        }
      />
      <PeekDrawer video={activeVideo} open={peekOpen} onClose={onClosePeek} onExpand={onExpand} />
      <ProductDetailsDrawer />
    </View>
  );
}

export function ShopFeedScreen(): ReactElement {
  return (
    <ProductSelectionProvider>
      <ShopFeedInner />
    </ProductSelectionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 8 },
  center: { textAlign: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  baseline: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  strike: { textDecorationLine: 'line-through' },
  topGap: { marginTop: 8 },
  card: { width: '100%', overflow: 'hidden' },
  scrim: { position: 'absolute', start: 0, end: 0, bottom: 0, height: '40%' },
  iconButton: { position: 'absolute', end: 12, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mute: { top: 12 },
  share: { top: 64 },
  caption: { position: 'absolute', start: 0, end: 0, bottom: 96, zIndex: 10, paddingHorizontal: 16 },
  anchor: { position: 'absolute', bottom: 32, alignSelf: 'center', zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingVertical: 8, paddingStart: 8, paddingEnd: 16, maxWidth: '85%' },
  anchorThumb: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  anchorText: { flexShrink: 1 },
  peek: { maxHeight: '88%' },
  peekBody: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8, gap: 16 },
  peekLoading: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 48 },
  peekState: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  peekProduct: { gap: 16 },
  peekRow: { flexDirection: 'row', gap: 16 },
  peekThumb: { width: 96, height: 96, borderRadius: 8, overflow: 'hidden' },
  peekActions: { gap: 8 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  loading: { flex: 1, gap: 16 },
  loadingFoot: { paddingHorizontal: 16, gap: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
});
