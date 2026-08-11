/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE (Chunk 4) — create a listing.
 */

import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CommunityListingForm } from "@/components/discover/CommunityListingForm";
import { createCommunityListing, type CommunityListingInput } from "@/hooks/useCommunityMarketplace";
import { notify, notifyError, t } from "@/lib/i18n-toast";

export default function CommunityMarketplaceNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (input: CommunityListingInput) => {
    try {
      const res = await createCommunityListing(input);
      queryClient.setQueryData(["community-marketplace-listing", res.listing.id], { ok: true, listing: res.listing });
      queryClient.invalidateQueries({ queryKey: ["community-marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["community-marketplace-my-listings"] });
      if (res.listing.requires_admin_review) {
        notify("toasts.communityMarketplace.listingCreated", "toasts.communityMarketplace.listingPendingReview");
      } else {
        notify("toasts.communityMarketplace.listingCreated");
      }
      navigate(`/discover/community-marketplace/${res.listing.id}`);
    } catch {
      notifyError("toasts.communityMarketplace.listingCreatedFailed");
    }
  };

  return (
    <AppLayout>
      <SEO title={t("screens.communityMarketplace.createTitle")} />
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("screens.communityMarketplace.back")}
        </Button>
        <h1 className="text-xl font-semibold mb-4">{t("screens.communityMarketplace.createTitle")}</h1>
        <CommunityListingForm mode="create" onSubmit={handleSubmit} onCancel={() => navigate(-1)} />
      </div>
    </AppLayout>
  );
}
