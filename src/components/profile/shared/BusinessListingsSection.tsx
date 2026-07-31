/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — Chunk 8: surfaces a seller's community
 * marketplace listings inside the existing profile "Business" tab, as a
 * second section alongside Recommend & Earn (DesktopBusinessCard/
 * MobileBusinessCard for the owner, BusinessPublicCard for a visitor).
 *
 * Owner variant shows the caller's own active listings (via /my/listings)
 * with a link to the full My Listings management page and a "post a
 * listing" CTA when empty. Visitor variant shows another seller's active
 * listings only (via GET /listings/by-seller/:vitanaId), mirroring
 * BusinessPublicCard's privacy posture — no view/contact-click counts, and
 * silently empty (no empty-state block) rather than adding a second "nothing
 * here" message under BusinessPublicCard's own.
 */

import { Link } from "react-router-dom";
import { Plus, Store } from "lucide-react";
import { CommunityListingImage } from "@/components/discover/CommunityListingImage";
import {
  useMyCommunityListings,
  useCommunityListingsBySeller,
  formatListingPrice,
  type CommunityListing,
} from "@/hooks/useCommunityMarketplace";
import { categoryLabel } from "@/lib/community-marketplace-categories";
import { t } from "@/lib/i18n-toast";

const OWNER_PREVIEW_LIMIT = 4;

interface BusinessListingsSectionProps {
  variant: "owner" | "visitor";
  vitanaId?: string | null;
  className?: string;
}

export function BusinessListingsSection({ variant, vitanaId, className }: BusinessListingsSectionProps) {
  const ownerQuery = useMyCommunityListings(
    { status: "active", limit: OWNER_PREVIEW_LIMIT },
    { enabled: variant === "owner" }
  );
  const visitorQuery = useCommunityListingsBySeller(vitanaId, { enabled: variant === "visitor" });
  const { data, isLoading } = variant === "owner" ? ownerQuery : visitorQuery;
  const items = data?.listings ?? [];

  // Visitor: no loading skeleton and no empty state for this secondary
  // section — it should just quietly appear once there's something to show,
  // rather than flashing a header/skeleton under BusinessPublicCard's own
  // loading/empty state and then disappearing.
  if (variant === "visitor" && (isLoading || items.length === 0)) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{t("profile.business.marketplaceTitle")}</h2>
        {variant === "owner" && (
          <Link to="/discover/community-marketplace/mine" className="text-xs font-medium text-primary shrink-0">
            {t("profile.business.marketplaceManage")}
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Link
          to="/discover/community-marketplace/new"
          className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {t("profile.business.marketplaceEmpty")}
        </Link>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <BusinessListingRow key={item.id} listing={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessListingRow({ listing }: { listing: CommunityListing }) {
  const priceText = formatListingPrice(listing);

  return (
    <Link
      to={`/discover/community-marketplace/${listing.id}`}
      className="flex gap-3 rounded-xl bg-muted/30 hover:bg-muted/50 p-2.5 transition-colors items-center"
    >
      <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden">
        <CommunityListingImage
          src={listing.images?.[0]}
          alt={listing.title}
          listingKind={listing.listing_kind}
          sizeClass="w-full h-full"
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-muted-foreground">{categoryLabel(listing.category)}</span>
        <h4 className="text-sm font-medium leading-snug line-clamp-1">{listing.title}</h4>
        <span className="text-sm font-semibold">{priceText ?? t("screens.communityMarketplace.priceOnRequest")}</span>
      </div>
      <Store className="h-4 w-4 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}
