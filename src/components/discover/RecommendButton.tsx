/**
 * VTID-02950: "Recommend & Earn" — recommend a product to others; if someone
 * buys it via the shared link, the recommender earns a wallet commission.
 * Sibling to BookmarkButton (opposite corner: bookmark is top-right, this is
 * top-left) so the two icon buttons never collide on a compact card.
 *
 * Clicking silently records the recommendation (toast confirms) — it does
 * NOT open a share dialog. Once recommended, the button shows an "already
 * recommended" filled state and further clicks are a no-op. Sharing the
 * link is a separate action from the Business profile tab.
 */

import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRecommendProduct } from "@/hooks/useRecommendProduct";
import { t } from "@/lib/i18n-toast";

interface RecommendButtonProps {
  productId: string;
  className?: string;
}

export function RecommendButton({ productId, className }: RecommendButtonProps) {
  const { recommendProduct, isRecommending, isRecommended } = useRecommendProduct(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void recommendProduct();
  };

  const label = t(isRecommended ? "discover.alreadyRecommended" : "discover.recommendProduct");

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isRecommending || isRecommended}
      className={cn(
        "absolute top-1 left-1 z-10",
        "transition-all duration-300 hover:scale-110",
        className
      )}
      aria-label={label}
      title={label}
    >
      <Megaphone
        className={cn(
          "h-4 w-4 transition-all duration-300 stroke-[2]",
          "drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
          isRecommended ? "text-emerald-400 fill-emerald-400/30" : "text-white",
          isRecommending && "opacity-50"
        )}
      />
    </Button>
  );
}
