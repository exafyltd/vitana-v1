/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — browse/search page at
 * /discover/community-marketplace.
 *
 * Peer-to-peer classifieds (contact-only — no Vitana checkout). Distinct
 * from /discover/marketplace (commercial buy/sell *intents*, matched by the
 * matchmaker) and from the curated affiliate catalog under /discover.
 *
 * Read-only browse + detail in this chunk. Posting a listing (Chunk 4) and
 * the full "Contact Seller" messaging flow (Chunk 5) land separately.
 */

import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useCommunityListingCategories,
  useCommunityListings,
  type CommunityListing,
  type CommunityListingBrowseParams,
} from "@/hooks/useCommunityMarketplace";
import { CommunityListingCard } from "@/components/discover/CommunityListingCard";
import { categoryOptionLabel } from "@/lib/community-marketplace-categories";
import { t } from "@/lib/i18n-toast";

const PAGE_SIZE = 24;
type Sort = CommunityListingBrowseParams["sort"];

export default function CommunityMarketplace() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<Sort>("newest");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [items, setItems] = useState<CommunityListing[]>([]);
  const [offset, setOffset] = useState(0);

  const { data: categoriesData } = useCommunityListingCategories();
  const categories = categoriesData?.categories ?? [];

  const params = useMemo<CommunityListingBrowseParams>(
    () => ({ q: q || undefined, category, sort, limit: PAGE_SIZE, offset }),
    [q, category, sort, offset]
  );
  const { data, isLoading, isFetching, error } = useCommunityListings(params);

  // Reset accumulated pages whenever the filter/sort/search changes (offset back to 0).
  const applyFilters = useCallback((next: Partial<{ q: string; category: string | undefined; sort: Sort }>) => {
    if (next.q !== undefined) setQ(next.q);
    if ("category" in next) setCategory(next.category);
    if (next.sort !== undefined) setSort(next.sort);
    setOffset(0);
    setItems([]);
  }, []);

  const listings = offset === 0 ? data?.listings ?? [] : [...items, ...(data?.listings ?? [])];
  const totalCount = data?.meta?.total_count ?? 0;
  const canLoadMore = listings.length < totalCount;

  const handleLoadMore = () => {
    setItems(listings);
    setOffset(listings.length);
  };

  const selectedCategoryLabel = category
    ? categoryOptionLabel(categories.find((c) => c.key === category) ?? { key: category, listing_kind: "both", display_label: category, parent_key: null, sort_order: 0 })
    : t("screens.communityMarketplace.filterAllCategories");

  return (
    <AppLayout>
      <SEO
        title={t("screens.communityMarketplace.title")}
        description={t("screens.communityMarketplace.subtitle")}
      />

      <div className="container mx-auto px-4 py-4 max-w-5xl">
        <StandardHeader
          title={t("screens.communityMarketplace.title")}
          description={t("screens.communityMarketplace.subtitle")}
        />

        <div className="flex items-center gap-2 mt-2">
          <UtilityActionButton className="min-w-0 flex-1" compact={isMobile}>
            <ExpandableSearchButton
              placeholder={t("screens.communityMarketplace.searchPlaceholder")}
              onSearch={(value) => applyFilters({ q: value })}
              filterLabel={selectedCategoryLabel}
              onFilterClick={() => setCategoryPickerOpen(true)}
            />
          </UtilityActionButton>

          <Select value={sort} onValueChange={(v) => applyFilters({ sort: v as Sort })}>
            <SelectTrigger className="w-auto h-9 text-sm shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("screens.communityMarketplace.sortNewest")}</SelectItem>
              <SelectItem value="price_asc">{t("screens.communityMarketplace.sortPriceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("screens.communityMarketplace.sortPriceDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isLoading && offset === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-sm text-destructive py-4">{t("screens.communityMarketplace.errorLoading")}</div>
          ) : listings.length === 0 ? (
            <EmptyState
              title={t("screens.communityMarketplace.emptyTitle")}
              body={t("screens.communityMarketplace.emptyBody")}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {listings.map((listing) => (
                  <CommunityListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => navigate(`/discover/community-marketplace/${listing.id}`)}
                  />
                ))}
              </div>

              {canLoadMore && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={handleLoadMore} disabled={isFetching}>
                    {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {t("screens.communityMarketplace.loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Sheet open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{t("screens.communityMarketplace.chooseCategory")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-1 mt-4 pb-6 max-h-[60vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => { applyFilters({ category: undefined }); setCategoryPickerOpen(false); }}
              className={`w-full flex items-center p-3 rounded-lg border transition-colors text-left ${
                !category ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <span className="font-medium">{t("screens.communityMarketplace.filterAllCategories")}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { applyFilters({ category: c.key }); setCategoryPickerOpen(false); }}
                className={`w-full flex items-center p-3 rounded-lg border transition-colors text-left ${
                  category === c.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <span className="font-medium">{categoryOptionLabel(c)}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
}

function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="flex flex-col items-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md">{body}</p>
      </div>
    </div>
  );
}
