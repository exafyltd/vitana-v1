/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4) — edit an own listing.
 *
 * Mirrors the backend's own guardrails (services/gateway/src/routes/
 * community-marketplace.ts PATCH /listings/:id): only the seller can edit,
 * and a sold/removed listing can't be edited at all.
 */

import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CommunityListingForm } from "@/components/discover/CommunityListingForm";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useCommunityListing, updateCommunityListing, type CommunityListingInput } from "@/hooks/useCommunityMarketplace";
import { notify, notifyError, t } from "@/lib/i18n-toast";

export default function CommunityMarketplaceEdit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCommunityListing(id);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  const listing = data?.listing;
  const isOwner = !!listing && !!viewerId && listing.seller_user_id === viewerId;
  const isEditable = !!listing && !["sold", "removed"].includes(listing.status);

  if (isLoading || viewerId === null) {
    return (
      <AppLayout>
        <div className="p-6 min-h-screen">
          <div className="max-w-2xl mx-auto animate-pulse space-y-4">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data?.ok || !listing || !isOwner || !isEditable) {
    return (
      <AppLayout>
        <SEO title={t("screens.communityMarketplace.notFoundTitle")} />
        <div className="p-6 min-h-screen flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardContent className="p-8 space-y-4">
              <h1 className="text-xl font-semibold">{t("screens.communityMarketplace.notFoundTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("screens.communityMarketplace.notFoundBody")}</p>
              <Button onClick={() => navigate("/discover/community-marketplace/mine")}>
                {t("screens.communityMarketplace.myListings")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const handleSubmit = async (input: CommunityListingInput) => {
    try {
      const { listing_kind, ...editableFields } = input;
      const res = await updateCommunityListing(listing.id, editableFields);
      // Write the fresh listing straight into the detail-query cache — the
      // detail page's staleTime otherwise keeps serving the pre-edit data
      // for up to 30s after navigating back to the same :id.
      queryClient.setQueryData(["community-marketplace-listing", res.listing.id], { ok: true, listing: res.listing });
      queryClient.invalidateQueries({ queryKey: ["community-marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["community-marketplace-my-listings"] });
      notify("toasts.communityMarketplace.listingUpdated");
      navigate(`/discover/community-marketplace/${res.listing.id}`);
    } catch {
      notifyError("toasts.communityMarketplace.listingUpdatedFailed");
    }
  };

  return (
    <AppLayout>
      <SEO title={t("screens.communityMarketplace.editTitle")} />
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("screens.communityMarketplace.back")}
        </Button>
        <h1 className="text-xl font-semibold mb-4">{t("screens.communityMarketplace.editTitle")}</h1>
        <CommunityListingForm mode="edit" initialListing={listing} onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
      </div>
    </AppLayout>
  );
}
