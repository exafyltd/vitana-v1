/**
 * VTID-02000: Reusable product card for the Discover marketplace.
 *
 * Renders: image, title, brand, price (with compare-at), rating, match_reasons,
 * origin flag, dietary badges, RewardBadge, AddToCartButton.
 *
 * Two variants:
 *   - "grid" (default): vertical card for grid layouts
 *   - "featured": horizontal card for the AI Picks featured slot
 *
 * Works on both mobile (compact) and desktop (full).
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, ExternalLink, Gift } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { ProductImage } from "@/components/discover/ProductImage";
import {
  type MarketplaceProduct,
  formatPrice,
  getRedirectUrl,
} from "@/hooks/useMarketplace";
import { t } from '@/lib/i18n-toast';

function RewardBadge({ reward_preview }: { reward_preview: MarketplaceProduct["reward_preview"] }) {
  if (!reward_preview?.points_estimate) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full px-1.5 py-0.5">
      <Gift className="w-3 h-3" />{t('screens.discover.points_estimatePts', { points_estimate: reward_preview.points_estimate })}
    </span>
  );
}

interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  variant?: "grid" | "featured";
  showMatchReasons?: boolean;
  surface?: string;
  onClick?: (product: MarketplaceProductCardProps["product"]) => void;
}

export function MarketplaceProductCard({
  product: p,
  variant = "grid",
  showMatchReasons = true,
  surface = "discover",
  onClick,
}: MarketplaceProductCardProps) {
  const image = p.images?.[0] ?? null;
  const hasDiscount =
    p.compare_at_price_cents &&
    p.price_cents &&
    p.compare_at_price_cents > p.price_cents;
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];

  const redirectUrl = getRedirectUrl(p.id, surface);

  if (variant === "featured") {
    return (
      <Card
        onClick={onClick ? () => onClick(p) : undefined}
        className={`overflow-hidden ${onClick ? "cursor-pointer" : ""}`}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-muted">
            <ProductImage
              src={image}
              alt={p.title}
              category={p.category}
              subcategory={p.subcategory}
              sizeClass="w-full h-full"
            />
          </div>
          <CardContent className="flex-1 p-4 flex flex-col justify-between gap-3">
            <div>
              {p.brand && (
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  {p.brand}
                </div>
              )}
              <h3 className="font-semibold text-base leading-tight line-clamp-2">
                {p.title}
              </h3>
              {p.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {p.description}
                </p>
              )}
              {showMatchReasons && matchReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {matchReasons.slice(0, 3).map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                      {r.text}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">
                  {formatPrice(p.price_cents, p.currency)}
                </span>
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(p.compare_at_price_cents, p.currency)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <RewardBadge reward_preview={p.reward_preview} />
                <a
                  href={redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >{t('screens.discover.buy')} <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  // ---- Grid variant (default) ----
  return (
    <Card
      onClick={onClick ? () => onClick(p) : undefined}
      className={`overflow-hidden hover:shadow-md transition-shadow group ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="aspect-square bg-muted overflow-hidden">
        <ProductImage
          src={image}
          alt={p.title}
          category={p.category}
          subcategory={p.subcategory}
          sizeClass="w-full h-full"
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="p-3 space-y-2">
        {/* Brand + origin */}
        <div className="flex items-center justify-between gap-1">
          {p.brand && (
            <span className="text-xs text-muted-foreground uppercase tracking-wide truncate">
              {p.brand}
            </span>
          )}
          {p.origin_country && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {p.origin_country}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {p.title}
        </h3>

        {/* Rating */}
        {p.rating !== null && p.rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{p.rating.toFixed(1)}</span>
            {p.review_count !== null && p.review_count > 0 && (
              <span className="text-xs text-muted-foreground">
                ({p.review_count.toLocaleString()})
              </span>
            )}
          </div>
        )}

        {/* Dietary badges */}
        {Array.isArray(p.dietary_tags) && p.dietary_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.dietary_tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Match reasons (compact) */}
        {showMatchReasons && matchReasons.length > 0 && (
          <div className="text-xs text-emerald-700 line-clamp-1">
            {matchReasons[0].text}
          </div>
        )}

        {/* Price + actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>
            <span className="font-semibold">
              {formatPrice(p.price_cents, p.currency)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through ml-1.5">
                {formatPrice(p.compare_at_price_cents, p.currency)}
              </span>
            )}
          </div>
          <RewardBadge reward_preview={p.reward_preview} />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2">
          <AddToCartButton
            item={{
              item_type: "product",
              item_id: p.id,
              item_name: p.title,
              item_price: p.price_cents ? p.price_cents / 100 : 0,
              item_image_url: image ?? undefined,
              item_metadata: { category: p.category, brand: p.brand },
            }}
          />
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0"
          >{t('screens.discover.buy')} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
