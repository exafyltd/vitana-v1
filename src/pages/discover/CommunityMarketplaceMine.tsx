/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4) — seller dashboard.
 *
 * Shows every listing the caller owns, across all statuses, with an Edit
 * entry point. Lifecycle actions (pause/activate/mark sold/remove/renew)
 * are deliberately out of scope here — Chunk 9 adds those buttons.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Plus, ShoppingBag } from "lucide-react";
import { CommunityListingImage } from "@/components/discover/CommunityListingImage";
import { useMyCommunityListings, formatListingPrice, type CommunityListing } from "@/hooks/useCommunityMarketplace";
import { categoryLabel } from "@/lib/community-marketplace-categories";
import { t } from "@/lib/i18n-toast";

const PAGE_SIZE = 50;
const IMMUTABLE_STATUSES = new Set(["sold", "removed"]);

const STATUS_BADGE_KEY: Record<string, string> = {
  draft: "screens.communityMarketplace.statusDraft",
  sold: "screens.communityMarketplace.statusSold",
  paused: "screens.communityMarketplace.statusPaused",
  suspended: "screens.communityMarketplace.statusSuspended",
};

export default function CommunityMarketplaceMine() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CommunityListing[]>([]);
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isFetching } = useMyCommunityListings({ limit: PAGE_SIZE, offset });
  const listings = offset === 0 ? data?.listings ?? [] : [...items, ...(data?.listings ?? [])];
  const totalCount = data?.meta?.total_count ?? 0;
  const canLoadMore = listings.length < totalCount;

  const handleLoadMore = () => {
    setItems(listings);
    setOffset(listings.length);
  };

  return (
    <AppLayout>
      <SEO title={t("screens.communityMarketplace.myListings")} />
      <div className="container mx-auto px-4 py-4 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("screens.communityMarketplace.back")}
          </Button>
          <Button size="sm" onClick={() => navigate("/discover/community-marketplace/new")}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("screens.communityMarketplace.postListing")}
          </Button>
        </div>

        <h1 className="text-xl font-semibold mb-4">{t("screens.communityMarketplace.myListings")}</h1>

        {isLoading && offset === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="flex flex-col items-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-1">{t("screens.communityMarketplace.myListingsEmptyTitle")}</h3>
              <p className="text-sm text-muted-foreground max-w-md">{t("screens.communityMarketplace.myListingsEmptyBody")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {listings.map((listing) => (
                <MyListingRow
                  key={listing.id}
                  listing={listing}
                  onEdit={
                    IMMUTABLE_STATUSES.has(listing.status)
                      ? undefined
                      : () => navigate(`/discover/community-marketplace/${listing.id}/edit`)
                  }
                />
              ))}
            </div>

            {canLoadMore && (
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={handleLoadMore} disabled={isFetching}>
                  {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {t("screens.communityMarketplace.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function MyListingRow({ listing, onEdit }: { listing: CommunityListing; onEdit?: () => void }) {
  const priceText = formatListingPrice(listing);
  const statusKey = STATUS_BADGE_KEY[listing.status];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-2.5">
      <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden">
        <CommunityListingImage src={listing.images?.[0]} alt={listing.title} listingKind={listing.listing_kind} sizeClass="w-full h-full" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] text-muted-foreground">{categoryLabel(listing.category)}</span>
        <h4 className="text-sm font-medium leading-snug line-clamp-1">{listing.title}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-semibold">{priceText ?? t("screens.communityMarketplace.priceOnRequest")}</span>
          {statusKey && (
            <Badge variant="secondary" className="text-[10px]">
              {t(statusKey)}
            </Badge>
          )}
        </div>
      </div>
      {onEdit && (
        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
          {t("screens.communityMarketplace.editButton")}
        </Button>
      )}
    </div>
  );
}
