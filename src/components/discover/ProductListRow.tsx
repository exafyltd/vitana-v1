/**
 * VTID-02000: Dense vertical-list product row, third member of the premium
 * card family (see ./PremiumProductCard.tsx) — used on "See all" category
 * listing screens where a grid of hero/compact cards would be too tall.
 */

import { Sparkles, ExternalLink } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { ProductImage } from "@/components/discover/ProductImage";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { bookmarkItem, cardKeyDown } from "@/components/discover/PremiumProductCard";
import {
  formatPrice,
  getRedirectUrl,
  type MarketplaceProduct,
} from "@/hooks/useMarketplace";

interface ProductListRowProps {
  product: MarketplaceProduct;
  badgeText: string;
  reasonText: string;
  onClick?: () => void;
}

export function ProductListRow({ product, badgeText, reasonText, onClick }: ProductListRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={product.title}
      onClick={onClick}
      onKeyDown={(e) => cardKeyDown(e, onClick)}
      className="flex gap-3 rounded-2xl bg-card border border-border/40 shadow-sm p-2.5 cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden">
        <ProductImage
          src={product.images?.[0]}
          alt={product.title}
          category={product.category}
          subcategory={product.subcategory}
          sizeClass="w-full h-full"
        />
        <BookmarkButton
          item={bookmarkItem(product)}
          className="h-5 w-5 bg-white/70 dark:bg-black/40 backdrop-blur hover:bg-white/90 dark:hover:bg-black/60"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300 mb-1">
            <Sparkles className="h-2.5 w-2.5" /> {badgeText}
          </span>
          <h4 className="text-sm font-medium leading-snug line-clamp-1">{product.title}</h4>
          {product.brand && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-1">{product.brand}</p>
          )}
          <p className="text-xs text-muted-foreground line-clamp-1">{reasonText}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{formatPrice(product.price_cents, product.currency)}</span>
          <a
            href={getRedirectUrl(product.id, "search")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
          >
            {t("discover.viewProduct")} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
