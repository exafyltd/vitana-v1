/**
 * VTID-02950: "Business" segment — the products a user has recommended from
 * Discover, with click/conversion stats and total commission earned. Fourth
 * member of the Identity/Social/Account segmented control (owner-only).
 */

import { Link } from "react-router-dom";
import { Briefcase, MousePointerClick, ShoppingBag } from "lucide-react";
import { useMyRecommendations, formatPrice } from "@/hooks/useMarketplace";
import { t } from "@/lib/i18n-toast";

export function MobileBusinessCard() {
  const { data, isLoading } = useMyRecommendations();
  const items = data?.items ?? [];

  return (
    <div className="rounded-2xl bg-card border border-border/40 shadow-sm p-4 space-y-1">
      <h2 className="text-base font-semibold">{t("profile.business.title")}</h2>
      <p className="text-xs text-muted-foreground mb-3">{t("profile.business.subtitle")}</p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">{t("profile.business.empty")}</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">{t("profile.business.emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/discover/product/${item.product_id}`}
              className="flex gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 p-2.5 transition-colors"
            >
              {item.product_thumbnail_url ? (
                <img
                  src={item.product_thumbnail_url}
                  alt={item.product_title ?? ""}
                  className="h-14 w-14 rounded-lg object-cover shrink-0 bg-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium leading-snug line-clamp-1">{item.product_title}</h4>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" /> {t("profile.business.clicks", { count: item.click_count })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag className="h-3 w-3" /> {t("profile.business.conversions", { count: item.conversion_count })}
                  </span>
                </div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatPrice(item.commission_earned_minor, item.currency)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
