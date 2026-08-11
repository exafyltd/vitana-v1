/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE: grid card for the browse page.
 */

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CommunityListingImage } from "@/components/discover/CommunityListingImage";
import { formatListingPrice, type CommunityListing } from "@/hooks/useCommunityMarketplace";
import { categoryLabel } from "@/lib/community-marketplace-categories";
import { t } from "@/lib/i18n-toast";

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new: "screens.communityMarketplace.conditionNew",
  like_new: "screens.communityMarketplace.conditionLikeNew",
  good: "screens.communityMarketplace.conditionGood",
  fair: "screens.communityMarketplace.conditionFair",
  used: "screens.communityMarketplace.conditionUsed",
};

interface CommunityListingCardProps {
  listing: CommunityListing;
  onClick?: () => void;
}

export function CommunityListingCard({ listing, onClick }: CommunityListingCardProps) {
  const priceText = formatListingPrice(listing);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={listing.title}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="flex flex-col rounded-2xl bg-card border border-border/40 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="relative">
        <CommunityListingImage
          src={listing.images?.[0]}
          alt={listing.title}
          listingKind={listing.listing_kind}
          sizeClass="w-full h-36"
        />
        {listing.status === "sold" && (
          <Badge className="absolute top-2 right-2 bg-foreground text-background">
            {t("screens.communityMarketplace.statusSold")}
          </Badge>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-1 p-3">
        <span className="text-[11px] font-medium text-muted-foreground line-clamp-1">
          {categoryLabel(listing.category)}
        </span>
        <h4 className="text-sm font-medium leading-snug line-clamp-2">{listing.title}</h4>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold">
            {priceText ?? t("screens.communityMarketplace.priceOnRequest")}
          </span>
          {listing.condition && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {t(CONDITION_LABEL_KEYS[listing.condition])}
            </Badge>
          )}
        </div>

        {listing.location_text && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1">
            <MapPin className="h-3 w-3 shrink-0" /> {listing.location_text}
          </span>
        )}
      </div>
    </div>
  );
}
