/**
 * VTID-02950: "Recommend & Earn" — recommend a product to others; if someone
 * buys it via the shared link, the recommender earns a wallet commission.
 * Sibling to BookmarkButton (opposite corner: bookmark is top-right, this is
 * top-left) so the two icon buttons never collide on a compact card.
 */

import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRecommendProduct } from "@/hooks/useRecommendProduct";
import { t } from "@/lib/i18n-toast";

interface RecommendButtonProps {
  productId: string;
  className?: string;
}

export function RecommendButton({ productId, className }: RecommendButtonProps) {
  const { recommendProduct, isRecommending } = useRecommendProduct();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void recommendProduct(productId);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isRecommending}
      className={cn(
        "absolute top-1 left-1 z-10",
        "transition-all duration-300 hover:scale-110",
        className
      )}
      aria-label={t("discover.recommendProduct")}
      title={t("discover.recommendProduct")}
    >
      <Share2
        className={cn(
          "h-4 w-4 transition-all duration-300 text-white stroke-[2]",
          "drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]",
          isRecommending && "opacity-50"
        )}
      />
    </Button>
  );
}
