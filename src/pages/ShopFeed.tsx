/**
 * Vitanaland Video Commerce — ShopFeed page (/shop).
 *
 * TikTok-style vertical, full-screen, snap-scrolling video feed over the
 * existing marketplace catalog. One primary product anchor per video; tapping
 * the anchor pill opens a single-product peek drawer (Vaul bottom sheet) over
 * the paused video. "Mehr Details" expands to the full PDP by reusing the
 * existing `ProductDetailsDrawer` via `ProductSelectionContext`.
 *
 * Conventions (hard requirements):
 *   - Buys flow through `useUniversalCart.addItem` with video-shop attribution
 *     (`source_surface:'video_shop'`, `source_video_id`, `source_creator_id`).
 *     NO separate buy-now — checkout is reached via /universal-cart.
 *   - View funnel emitted as telemetry via `useShopEvents` (impression /
 *     hold_2s / anchor_tap / drawer_open / drawer_expand / add_to_cart /
 *     share / drawer_close).
 *   - All user-visible strings via `t('videoShop.*')`; money via format-money;
 *     numbers via locale-format. No inline styles (CSP); Tailwind only.
 *   - Autoplay on-screen / pause when drawer open / resume on close.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Share2,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ProductImage } from "@/components/discover/ProductImage";
import { ProductDetailsDrawer } from "@/components/discover/ProductDetailsDrawer";
import {
  ProductSelectionProvider,
  useProductSelection,
} from "@/context/ProductSelectionContext";
import { AffiliateDisclosure } from "@/components/discover/AffiliateDisclosure";
import { useShopFeed, useShopVideoAnchor, useShopEvents } from "@/hooks/useShopFeed";
import { useUniversalCart } from "@/hooks/useUniversalCart";
import {
  ShopAnchorLive,
  ShopProduct,
  VideoItem,
} from "@/lib/shop-feed-client";
import { UniversalCartApiError } from "@/lib/universal-cart-client";
import type { MarketplaceProduct } from "@/hooks/useMarketplace";
import { formatMoneyMinor, type GatewayCurrency } from "@/lib/format-money";
import { fmtNumber } from "@/lib/locale-format";
import { notify, notifyError, t } from "@/lib/i18n-toast";

const HOLD_THRESHOLD_MS = 2_000;

/** Format a minor-unit price using the gateway money helper (locale-safe). */
function priceLabel(cents: number | null, currency: string | null): string {
  if (cents == null) return "";
  const cur = (currency ?? "EUR").toUpperCase();
  const safe: GatewayCurrency = cur === "USD" ? "USD" : "EUR";
  return formatMoneyMinor(cents, safe);
}

/**
 * Map a shop-feed product onto the `MarketplaceProduct` shape the shared
 * `ProductDetailsDrawer` consumes via `ProductSelectionContext`.
 */
function toMarketplaceProduct(p: ShopProduct): MarketplaceProduct {
  const get = <T,>(k: string): T | undefined => p[k] as T | undefined;
  return {
    id: p.id,
    title: p.title ?? "",
    description: get<string>("description") ?? null,
    description_long: get<string>("description_long") ?? null,
    brand: get<string>("brand") ?? null,
    category: get<string>("category") ?? null,
    subcategory: get<string>("subcategory") ?? null,
    price_cents: p.price_cents,
    currency: p.currency,
    compare_at_price_cents: p.compare_at_price_cents,
    images: Array.isArray(p.images) ? p.images : [],
    affiliate_url: p.affiliate_url ?? "",
    availability: p.availability,
    rating: p.rating,
    review_count: p.review_count,
    origin_country: get<string>("origin_country") ?? null,
    origin_region: get<string>("origin_region") ?? null,
    merchant_id: p.merchant_id,
    ingredients_primary: get<string[]>("ingredients_primary") ?? [],
    health_goals: get<string[]>("health_goals") ?? [],
    dietary_tags: get<string[]>("dietary_tags") ?? [],
    reward_preview: get("reward_preview") ?? null,
    dosage: get<string>("dosage") ?? null,
    serving_size: get<string>("serving_size") ?? null,
    servings_per_container: get<number>("servings_per_container") ?? null,
    evidence_links: get("evidence_links") ?? [],
    safety_notes: get<string>("safety_notes") ?? null,
  };
}

// =============================================================================
// Single video card
// =============================================================================

function VideoCard({
  video,
  muted,
  onToggleMute,
  drawerOpen,
  onOpenAnchor,
  onShare,
  onImpression,
  onHold,
}: {
  video: VideoItem;
  muted: boolean;
  onToggleMute: () => void;
  drawerOpen: boolean;
  onOpenAnchor: (video: VideoItem) => void;
  onShare: (video: VideoItem) => void;
  onImpression: (videoId: string) => void;
  onHold: (videoId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  const impressedRef = useRef(false);
  const heldRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IntersectionObserver: track which card is on screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setOnScreen(entry.isIntersecting && entry.intersectionRatio >= 0.6);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay on-screen / pause off-screen or when the drawer is open.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = muted;
    if (onScreen && !drawerOpen) {
      void el.play().catch(() => {
        /* autoplay can be blocked until interaction — ignore */
      });
      // Impression once per card.
      if (!impressedRef.current) {
        impressedRef.current = true;
        onImpression(video.id);
      }
      // Hold_2s after the threshold of continuous on-screen play.
      if (!heldRef.current && !holdTimerRef.current) {
        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          if (!heldRef.current) {
            heldRef.current = true;
            onHold(video.id);
          }
        }, HOLD_THRESHOLD_MS);
      }
    } else {
      el.pause();
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    }
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [onScreen, drawerOpen, muted, video.id, onImpression, onHold]);

  const anchor = video.primary_anchor;

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        src={video.playback.video_url}
        poster={video.playback.poster_url ?? undefined}
        playsInline
        loop
        muted={muted}
        preload="metadata"
      />

      {/* Gradient scrim for legibility */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Mute toggle */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        aria-label={
          muted ? t("videoShop.feed.unmute") : t("videoShop.feed.mute")
        }
        className="absolute right-3 top-3 z-10 text-white hover:bg-white/20"
      >
        {muted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
      </Button>

      {/* Share */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onShare(video)}
        aria-label={t("videoShop.feed.share")}
        className="absolute right-3 top-16 z-10 text-white hover:bg-white/20"
      >
        <Share2 className="h-5 w-5" />
      </Button>

      {/* Caption */}
      {video.caption && (
        <div className="absolute inset-x-0 bottom-24 z-10 px-4">
          <p className="line-clamp-2 text-sm font-medium text-white drop-shadow">
            {video.caption}
          </p>
        </div>
      )}

      {/* Anchor pill */}
      {anchor && (
        <button
          type="button"
          onClick={() => onOpenAnchor(video)}
          className="absolute bottom-8 left-1/2 z-10 flex max-w-[88%] -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 py-2 pl-2 pr-4 text-left shadow-lg backdrop-blur transition active:scale-95"
        >
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
            <ProductImage
              src={anchor.product.images?.[0]}
              alt={anchor.product.title ?? t("videoShop.drawer.productFallback")}
              sizeClass="h-10 w-10"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {anchor.label}
            </span>
            {anchor.badge_price_cents != null && (
              <span className="block text-xs font-medium text-muted-foreground">
                {priceLabel(anchor.badge_price_cents, anchor.currency)}
              </span>
            )}
          </span>
          <ShoppingBag className="h-4 w-4 shrink-0 text-foreground" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Peek drawer (single product) — live anchor + add to cart
// =============================================================================

function PeekDrawer({
  video,
  open,
  onClose,
  onExpand,
}: {
  video: VideoItem | null;
  open: boolean;
  onClose: () => void;
  onExpand: (anchor: ShopAnchorLive) => void;
}) {
  const { anchor, isLoading, unavailable, error, refetch } = useShopVideoAnchor(
    video?.id ?? null,
    { enabled: open && !!video },
  );
  const { addItem, isAdding, roleBlocked } = useUniversalCart();
  const { emit } = useShopEvents();

  const product = anchor?.product;
  const inStock = product ? product.in_stock : false;

  const onAddToCart = useCallback(async () => {
    if (!video || !anchor || !product) return;
    emit(video.id, {
      type: "add_to_cart",
      anchor_id: anchor.id,
      product_id: product.id,
    });
    try {
      await addItem({
        product_id: product.id,
        item_type: "partner_product",
        quantity: 1,
        source_surface: "video_shop",
        source_ref: video.id,
        source_video_id: video.id,
        ...(video.creator_id ? { source_creator_id: video.creator_id } : {}),
        ...(product.merchant_id ? { merchant_id: product.merchant_id } : {}),
        ...(product.price_cents != null
          ? { unit_price_cents_snapshot: product.price_cents }
          : {}),
        ...(product.currency
          ? { currency_snapshot: product.currency }
          : {}),
      });
      notify("videoShop.drawer.addedTitle", "videoShop.drawer.addedBody");
    } catch (err) {
      const code = err instanceof UniversalCartApiError ? err.code : undefined;
      notifyError("videoShop.drawer.addFailed");
      if (code) console.warn("[video-shop] add_to_cart failed:", code);
    }
  }, [video, anchor, product, addItem, emit]);

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>
            {product?.title ?? t("videoShop.drawer.productFallback")}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-5 pb-8 pt-2">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t("videoShop.drawer.loading")}</span>
            </div>
          )}

          {!isLoading && roleBlocked && (
            <div className="space-y-2 py-10 text-center">
              <h2 className="text-lg font-medium">
                {t("videoShop.drawer.roleBlockedTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("videoShop.drawer.roleBlockedBody")}
              </p>
            </div>
          )}

          {!isLoading && unavailable && (
            <div className="space-y-2 py-10 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
              <h2 className="text-lg font-medium">
                {t("videoShop.drawer.unavailableTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("videoShop.drawer.unavailableBody")}
              </p>
            </div>
          )}

          {!isLoading && !unavailable && !roleBlocked && error && (
            <div className="space-y-3 py-10 text-center">
              <h2 className="text-lg font-medium">
                {t("videoShop.drawer.errorTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("videoShop.drawer.errorBody")}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {t("videoShop.drawer.retry")}
              </Button>
            </div>
          )}

          {!isLoading && !unavailable && !roleBlocked && !error && product && anchor && (
            <>
              <div className="flex gap-4">
                <span className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <ProductImage
                    src={product.images?.[0]}
                    alt={product.title ?? t("videoShop.drawer.productFallback")}
                    sizeClass="h-24 w-24"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight">
                    {product.title ?? t("videoShop.drawer.productFallback")}
                  </h2>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold">
                      {priceLabel(product.price_cents, product.currency)}
                    </span>
                    {product.compare_at_price_cents != null &&
                      product.price_cents != null &&
                      product.compare_at_price_cents > product.price_cents && (
                        <span className="text-sm text-muted-foreground line-through">
                          {priceLabel(
                            product.compare_at_price_cents,
                            product.currency,
                          )}
                        </span>
                      )}
                  </div>
                  {product.rating != null && product.rating > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-foreground">
                        {fmtNumber(product.rating, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </span>
                      {product.review_count ? (
                        <span>({fmtNumber(product.review_count)})</span>
                      ) : null}
                    </div>
                  )}
                  {!inStock && (
                    <Badge variant="secondary" className="mt-2">
                      {t("videoShop.drawer.outOfStock")}
                    </Badge>
                  )}
                </div>
              </div>

              <AffiliateDisclosure compact />

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    size="lg"
                    disabled={isAdding || !inStock}
                    onClick={onAddToCart}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("videoShop.drawer.adding")}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {inStock
                          ? t("videoShop.drawer.addToCart")
                          : t("videoShop.drawer.notifyMe")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => onExpand(anchor)}
                  >
                    {t("videoShop.drawer.moreDetails")}
                  </Button>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/universal-cart">
                    {t("videoShop.drawer.goToCart")}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// =============================================================================
// Inner feed (inside ProductSelectionProvider so it can expand to full PDP)
// =============================================================================

function ShopFeedInner() {
  const {
    videos,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    roleBlocked,
    fetchNextPage,
    refresh,
  } = useShopFeed();
  const { emit, sessionId } = useShopEvents();
  const { selectProduct, selectedProduct } = useProductSelection();

  const [muted, setMuted] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const expandedPdpOpen = !!selectedProduct;
  const peekOpen = !!activeVideo && !expandedPdpOpen;
  // Pause all videos whenever any sheet (peek or expanded PDP) is open.
  const anySheetOpen = peekOpen || expandedPdpOpen;

  // Infinite-scroll sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage]);

  const onImpression = useCallback(
    (videoId: string) => emit(videoId, { type: "impression", session_id: sessionId }),
    [emit, sessionId],
  );
  const onHold = useCallback(
    (videoId: string) => emit(videoId, { type: "hold_2s", session_id: sessionId }),
    [emit, sessionId],
  );

  const onOpenAnchor = useCallback(
    (video: VideoItem) => {
      setActiveVideo(video);
      if (video.primary_anchor) {
        emit(video.id, {
          type: "anchor_tap",
          anchor_id: video.primary_anchor.id,
          product_id: video.primary_anchor.product.id,
        });
        emit(video.id, {
          type: "drawer_open",
          anchor_id: video.primary_anchor.id,
          product_id: video.primary_anchor.product.id,
        });
      }
    },
    [emit],
  );

  const onClosePeek = useCallback(() => {
    if (activeVideo?.primary_anchor) {
      emit(activeVideo.id, {
        type: "drawer_close",
        anchor_id: activeVideo.primary_anchor.id,
      });
    }
    setActiveVideo(null);
  }, [activeVideo, emit]);

  const onExpand = useCallback(
    (anchor: ShopAnchorLive) => {
      if (activeVideo) {
        emit(activeVideo.id, {
          type: "drawer_expand",
          anchor_id: anchor.id,
          product_id: anchor.product.id,
        });
      }
      selectProduct(toMarketplaceProduct(anchor.product));
    },
    [activeVideo, emit, selectProduct],
  );

  const onShare = useCallback(
    async (video: VideoItem) => {
      emit(video.id, { type: "share" });
      const url = `${window.location.origin}/shop?v=${encodeURIComponent(video.id)}`;
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ url, title: video.title ?? undefined });
        } else if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          notify("videoShop.feed.linkCopied");
        }
      } catch {
        /* user dismissed share sheet — ignore */
      }
    },
    [emit],
  );

  // -- Role-blocked: community-only empty state -------------------------------
  if (roleBlocked) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 px-6 text-center">
        <h1 className="text-xl font-semibold">
          {t("videoShop.feed.roleBlockedTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("videoShop.feed.roleBlockedBody")}
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{t("videoShop.feed.loading")}</span>
      </main>
    );
  }

  if (error && !roleBlocked) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">
          {t("videoShop.feed.errorTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("videoShop.feed.errorBody")}
        </p>
        <Button variant="outline" onClick={() => refresh()}>
          {t("videoShop.feed.retry")}
        </Button>
      </main>
    );
  }

  if (videos.length === 0) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 px-6 text-center">
        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          {t("videoShop.feed.emptyTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("videoShop.feed.emptyBody")}
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link to="/discover">{t("videoShop.feed.browseDiscover")}</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full overflow-y-scroll bg-black snap-y snap-mandatory">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          drawerOpen={anySheetOpen}
          onOpenAnchor={onOpenAnchor}
          onShare={onShare}
          onImpression={onImpression}
          onHold={onHold}
        />
      ))}

      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 bg-black py-6 text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("videoShop.feed.loadingMore")}</span>
        </div>
      )}
      {!hasNextPage && (
        <div className="bg-black py-6 text-center text-sm text-white/60">
          {t("videoShop.feed.end")}
        </div>
      )}

      {/* Single-product peek drawer */}
      <PeekDrawer
        video={activeVideo}
        open={peekOpen}
        onClose={onClosePeek}
        onExpand={onExpand}
      />

      {/* Expanded full PDP — reuses the existing shared drawer. */}
      <ProductDetailsDrawer />
    </main>
  );
}

export default function ShopFeed() {
  return (
    <ProductSelectionProvider>
      <ShopFeedInner />
    </ProductSelectionProvider>
  );
}
