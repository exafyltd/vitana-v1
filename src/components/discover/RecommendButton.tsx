/**
 * VTID-02950: "Recommend & Earn" — recommend a product to others; if someone
 * buys it via the shared link, the recommender earns a wallet commission.
 *
 * Clicking silently records the recommendation (toast confirms) — it does
 * NOT open a share dialog. Once recommended, the button shows an "already
 * recommended" filled state and further clicks are a no-op. Sharing the
 * link is a separate action from the Business profile tab.
 *
 * Two visual treatments:
 *  - "badge" (default): compact icon-only circle for card-corner overlays
 *    (PremiumProductCard, ProductListRow) — sibling to BookmarkButton
 *    (opposite corner: bookmark is top-right, this is top-left).
 *  - "pill": labeled chip (icon + "Recommend" text) for spacious action rows
 *    (ProductDetail, ProductDetailsDrawer) where a bare icon read as barely
 *    visible next to bordered siblings like Buy/Share.
 */

import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRecommendProduct } from "@/hooks/useRecommendProduct";
import { t } from "@/lib/i18n-toast";

interface RecommendButtonProps {
  productId: string;
  className?: string;
  variant?: "badge" | "pill";
  size?: "sm" | "default" | "lg";
}

export function RecommendButton({ productId, className, variant = "badge", size = "default" }: RecommendButtonProps) {
  const { recommendProduct, isRecommending, isRecommended } = useRecommendProduct(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void recommendProduct();
  };

  const label = t(isRecommended ? "discover.alreadyRecommended" : "discover.recommendProduct");

  if (variant === "pill") {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        disabled={isRecommending || isRecommended}
        className={cn(
          "rounded-full transition-all",
          isRecommending && "opacity-60",
          className,
          isRecommended && "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600 disabled:opacity-100"
        )}
      >
        <BadgeCheck className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isRecommending || isRecommended}
      className={cn(
        "absolute top-1 left-1 z-10 rounded-full border shadow-sm",
        "transition-all duration-300 hover:scale-110",
        !isRecommended && "border-white/50 dark:border-white/15",
        className,
        isRecommended && "bg-emerald-500 border-emerald-500 disabled:opacity-100"
      )}
      aria-label={label}
      title={label}
    >
      <BadgeCheck
        className={cn(
          "h-4 w-4 text-white transition-all duration-300 stroke-[2]",
          "drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
          isRecommending && "opacity-50"
        )}
      />
    </Button>
  );
}
