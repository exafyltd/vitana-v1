/**
 * VTID-02000: Premium, editorial-style product cards for Discover.
 *
 * Two variants, both sharing the same visual language (soft violet accents,
 * generous whitespace, rounded corners, one primary action):
 *   - FeaturedProductCard — large hero, full width
 *   - CompactProductCard  — narrow card for horizontal-scroll collections
 *
 * Badge/reason text is computed by the caller (see `@/lib/discover-reason`)
 * and passed in, so these stay presentational.
 */

import type { KeyboardEvent } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { ProductImage } from "@/components/discover/ProductImage";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import {
  formatPrice,
  getRedirectUrl,
  type MarketplaceProduct,
} from "@/hooks/useMarketplace";

interface PremiumCardProps {
  product: MarketplaceProduct;
  badgeText: string;
  reasonText: string;
  onClick?: () => void;
}

function bookmarkItem(product: MarketplaceProduct) {
  return {
    item_type: "supplement" as const,
    item_id: product.id,
    item_name: product.title,
    item_image_url: product.images?.[0],
    item_metadata: { brand: product.brand, category: product.subcategory },
  };
}

function cardKeyDown(e: KeyboardEvent, onClick?: () => void) {
  // Only act when the card itself is focused — Enter/Space from a nested
  // interactive child (bookmark, view-product link) must activate that
  // control, not bubble up into card navigation.
  if (e.target !== e.currentTarget) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onClick?.();
  }
}

export function FeaturedProductCard({ product, badgeText, reasonText, onClick }: PremiumCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={product.title}
      onClick={onClick}
      onKeyDown={(e) => cardKeyDown(e, onClick)}
      className="relative overflow-hidden rounded-[28px] bg-card border border-border/40 shadow-[0_2px_24px_-6px_rgba(0,0,0,0.1)] cursor-pointer transition-shadow hover:shadow-[0_4px_28px_-4px_rgba(0,0,0,0.14)]"
    >
      <div className="relative h-56">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          category={product.category}
          subcategory={product.subcategory}
          sizeClass="w-full h-full"
        />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-card/95 backdrop-blur px-3 py-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 shadow-sm">
          <Sparkles className="h-3 w-3" /> {badgeText}
        </span>
        <BookmarkButton
          item={bookmarkItem(product)}
          className="bg-white/70 dark:bg-black/40 backdrop-blur hover:bg-white/90 dark:hover:bg-black/60"
        />
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg leading-snug line-clamp-2">{product.title}</h3>
          {product.brand && (
            <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-violet-50 dark:bg-violet-500/10 px-3 py-2.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300 leading-snug">
            {reasonText}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xl font-bold">{formatPrice(product.price_cents, product.currency)}</span>
          <a
            href={getRedirectUrl(product.id, "feed")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors shrink-0"
          >
            {t("discover.viewProduct")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function CompactProductCard({ product, badgeText, reasonText, onClick }: PremiumCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={product.title}
      onClick={onClick}
      onKeyDown={(e) => cardKeyDown(e, onClick)}
      className="snap-start shrink-0 w-[168px] rounded-2xl bg-card border border-border/40 shadow-sm cursor-pointer overflow-hidden active:scale-[0.97] transition-transform"
    >
      <div className="relative h-[124px]">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          category={product.category}
          subcategory={product.subcategory}
          sizeClass="w-full h-full"
        />
        <BookmarkButton
          item={bookmarkItem(product)}
          className="h-7 w-7 bg-white/70 dark:bg-black/40 backdrop-blur hover:bg-white/90 dark:hover:bg-black/60"
        />
      </div>

      <div className="p-2.5 space-y-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
          <Sparkles className="h-2.5 w-2.5" /> {badgeText}
        </span>
        <h4 className="text-sm font-medium leading-snug line-clamp-2 min-h-[2.5rem]">{product.title}</h4>
        {product.brand && (
          <p className="text-[11px] text-muted-foreground/80 line-clamp-1">{product.brand}</p>
        )}
        <p className="text-xs text-muted-foreground line-clamp-1">{reasonText}</p>
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <span className="text-sm font-semibold">{formatPrice(product.price_cents, product.currency)}</span>
          <a
            href={getRedirectUrl(product.id, "feed")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={t("discover.viewProduct")}
            className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
