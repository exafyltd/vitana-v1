/**
 * VTID-02950: "Business" segment (desktop) — same data as
 * MobileBusinessCard.tsx, laid out for the wider desktop card container.
 */

import { Link } from "react-router-dom";
import { Briefcase, MousePointerClick, ShoppingBag, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyRecommendations, formatPrice, MyRecommendationItem } from "@/hooks/useMarketplace";
import { useNativeShare } from "@/hooks/useNativeShare";
import { t, notifySuccess, notifyError } from "@/lib/i18n-toast";
import { BusinessListingsSection } from "../shared/BusinessListingsSection";

interface DesktopBusinessCardProps {
  className?: string;
}

export function DesktopBusinessCard({ className }: DesktopBusinessCardProps) {
  const { data, isLoading } = useMyRecommendations();
  const items = data?.items ?? [];
  const { share } = useNativeShare({ contentId: "business-recommendation-row", contentType: "product_recommendation" });

  const handleShare = async (e: React.MouseEvent, item: MyRecommendationItem) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/discover/product/${item.product_id}?rec=${item.id}`;
    const title = t("discover.recommendShareTitle", { product: item.product_title ?? "" });
    const result = await share({ title, url });
    if (result === "failed") {
      try {
        await navigator.clipboard.writeText(url);
        notifySuccess("discover.recommendLinkCopied");
      } catch {
        notifyError("toasts.common.couldnTCopyPleaseCopyLink");
      }
    }
  };

  return (
    <div className={cn("relative rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm p-6", className)}>
      <h2 className="text-lg font-semibold">{t("profile.business.title")}</h2>
      <p className="text-sm text-muted-foreground mb-5">{t("profile.business.subtitle")}</p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 space-y-2">
          <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">{t("profile.business.empty")}</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("profile.business.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/discover/product/${item.product_id}`}
              className="flex gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 p-3 transition-colors"
            >
              {item.product_thumbnail_url ? (
                <img
                  src={item.product_thumbnail_url}
                  alt={item.product_title ?? ""}
                  className="h-16 w-16 rounded-lg object-cover shrink-0 bg-white"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium leading-snug line-clamp-1">{item.product_title}</h4>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick className="h-3.5 w-3.5" /> {t("profile.business.clicks", { count: item.click_count })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag className="h-3.5 w-3.5" /> {t("profile.business.conversions", { count: item.conversion_count })}
                  </span>
                </div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatPrice(item.commission_earned_minor, item.currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleShare(e, item)}
                className="self-center shrink-0 p-3 -mr-1 rounded-full hover:bg-muted/60 text-muted-foreground"
                aria-label={t("profile.business.shareRow")}
                title={t("profile.business.shareRow")}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </div>
      )}

      <BusinessListingsSection variant="owner" className="mt-6 pt-6 border-t border-border/40" />
    </div>
  );
}
