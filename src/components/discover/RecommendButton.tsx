/**
 * VTID-02950: "Recommend & Earn" — recommend a product to others; if someone
 * buys it via the shared link, the recommender earns a wallet commission.
 *
 * Clicking silently records the recommendation (toast confirms) — it does
 * NOT open a share dialog. Once recommended, the button shows a "recommended"
 * filled state and further clicks are a no-op. Sharing the link is a
 * separate action from the Business profile tab.
 *
 * Two visual treatments:
 *  - "badge" (default): compact icon-only circle for card-corner overlays
 *    (PremiumProductCard, ProductListRow) — sibling to BookmarkButton
 *    (opposite corner: bookmark is top-right, this is top-left).
 *  - "cta": prominent green pill (icon badge + "Recommend & Earn" text +
 *    trailing chevron) for spacious action rows (ProductDetail,
 *    ProductDetailsDrawer) — the chevron is purely decorative, matching
 *    this codebase's existing row-affordance convention (MobileWalletBalanceCard,
 *    MobileIntegrationRow), not an independently-clickable target.
 */

import { BadgeCheck, Star, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRecommendProduct } from "@/hooks/useRecommendProduct";
import { t } from "@/lib/i18n-toast";

interface RecommendButtonProps {
  productId: string;
  className?: string;
  variant?: "badge" | "cta";
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

  if (variant === "cta") {
    const ctaLabel = isRecommended ? t("discover.alreadyRecommended") : t("discover.recommendAndEarn");
    return (
      <Button
        variant="default"
        size={size}
        onClick={handleClick}
        disabled={isRecommending || isRecommended}
        className={cn(
          "justify-between rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-100",
          isRecommending && "opacity-70",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Star className="h-3.5 w-3.5 fill-white text-white" />
          </span>
          {ctaLabel}
        </span>
        {isRecommended ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
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
