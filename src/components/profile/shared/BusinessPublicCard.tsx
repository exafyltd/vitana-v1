/**
 * VTID-02950 extension (BOOTSTRAP-PUBLIC-BUSINESS-PROFILE): public storefront
 * view of another user's Business tab. Visitor sees product thumbnail/title
 * and a buy/view CTA that reuses the existing recommendation-attribution
 * flow (?rec=<recommendation_id> -> ProductDetail -> getRedirectUrl -> /r/:id
 * -> click-redirect.ts credits attribution_recommendation_id). No click/
 * conversion/commission stats are ever fetched or shown here (privacy —
 * enforced server-side too, see discover-recommendations-public.ts).
 *
 * Shared between mobile and desktop — unlike the owner's dashboard
 * (MobileBusinessCard/DesktopBusinessCard, which diverge in layout), this
 * view is simple enough (thumbnail + title + CTA + disclosure) not to need
 * separate layouts.
 */

import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { usePublicRecommendations, PublicRecommendationItem } from "@/hooks/useMarketplace";
import { AffiliateDisclosure } from "@/components/discover/AffiliateDisclosure";
import { BusinessListingsSection } from "./BusinessListingsSection";
import { t } from "@/lib/i18n-toast";

interface BusinessPublicCardProps {
  vitanaId: string | undefined;
  className?: string;
}

export function BusinessPublicCard({ vitanaId, className }: BusinessPublicCardProps) {
  const { data, isLoading } = usePublicRecommendations(vitanaId);
  const items = data?.items ?? [];
  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className={`rounded-2xl bg-card border border-border/40 shadow-sm p-4 space-y-1 ${className ?? ""}`}>
      <h2 className="text-base font-semibold">{t("profile.business.publicTitle")}</h2>
      <p className="text-xs text-muted-foreground mb-3">{t("profile.business.publicSubtitle")}</p>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : isEmpty ? (
        // A visitor landing on this tab with zero recommendations still needs
        // to see *something* — a silently blank card below the tab bar reads
        // as broken, not "nothing here yet".
        <div className="text-center py-10 space-y-2">
          <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">{t("profile.business.publicEmpty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: PublicRecommendationItem) => (
            <Link
              key={item.recommendation_id}
              to={`/discover/product/${item.product_id}?rec=${item.recommendation_id}`}
              className="flex gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 p-2.5 transition-colors items-center"
            >
              {item.product_thumbnail_url ? (
                <img
                  src={item.product_thumbnail_url}
                  alt={item.product_title ?? ""}
                  className="h-14 w-14 rounded-lg object-cover shrink-0 bg-white"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium leading-snug line-clamp-1">{item.product_title}</h4>
              </div>
              <span className="text-xs font-semibold text-primary shrink-0 pr-1">
                {t("profile.business.viewProduct")}
              </span>
            </Link>
          ))}
        </div>
      )}

      {!isEmpty && !isLoading && <AffiliateDisclosure compact className="mt-3" />}

      <BusinessListingsSection variant="visitor" vitanaId={vitanaId} className="mt-4 pt-4 border-t border-border/40" />
    </div>
  );
}
