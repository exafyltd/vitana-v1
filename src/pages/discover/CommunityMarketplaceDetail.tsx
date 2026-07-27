/**
 * BOOTSTRAP-COMMUNITY-MARKETPLACE — listing detail page at
 * /discover/community-marketplace/:id.
 *
 * Read-only viewing + a "Contact Seller" action that records a
 * contact-click and hands off to the seller's public profile — the full
 * in-app messaging CTA (compose modal referencing the listing, etc.) is a
 * separate later chunk; this is the safe interim per the same scoping used
 * elsewhere in this feature.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, Eye, BadgeCheck, Loader2, Truck, Store } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { CommunityListingImage } from "@/components/discover/CommunityListingImage";
import {
  useCommunityListing,
  contactCommunityListingSeller,
  formatListingPrice,
} from "@/hooks/useCommunityMarketplace";
import { categoryLabel } from "@/lib/community-marketplace-categories";
import { formatDistanceToNow } from "@/lib/locale-format";
import { notifyError } from "@/lib/i18n-toast";
import { t } from "@/lib/i18n-toast";

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new: "screens.communityMarketplace.conditionNew",
  like_new: "screens.communityMarketplace.conditionLikeNew",
  good: "screens.communityMarketplace.conditionGood",
  fair: "screens.communityMarketplace.conditionFair",
  used: "screens.communityMarketplace.conditionUsed",
};

const DELIVERY_LABEL_KEYS: Record<string, string> = {
  pickup: "screens.communityMarketplace.deliveryPickup",
  shipping: "screens.communityMarketplace.deliveryShipping",
  both: "screens.communityMarketplace.deliveryBoth",
};

export default function CommunityMarketplaceDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCommunityListing(id);
  const [contacting, setContacting] = useState(false);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 min-h-screen">
          <div className="max-w-3xl mx-auto animate-pulse space-y-4">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-72 bg-muted rounded-xl" />
            <div className="h-8 w-2/3 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-5/6 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data?.ok || !data.listing) {
    return (
      <AppLayout>
        <SEO title={t("screens.communityMarketplace.notFoundTitle")} />
        <div className="p-6 min-h-screen flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardContent className="p-8 space-y-4">
              <h1 className="text-xl font-semibold">{t("screens.communityMarketplace.notFoundTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("screens.communityMarketplace.notFoundBody")}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  {t("screens.communityMarketplace.back")}
                </Button>
                <Button asChild>
                  <Link to="/discover/community-marketplace">{t("screens.communityMarketplace.browseMarketplace")}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const listing = data.listing;
  const priceText = formatListingPrice(listing);
  const seller = listing.seller;
  // Owner-only fields (see serializeListing() in the gateway route) are only
  // ever present in the response when the caller is the seller — no extra
  // auth lookup needed to tell them apart from a buyer viewing the listing.
  const isOwner = listing.requires_admin_review !== undefined;

  const handleContactSeller = async () => {
    if (!id) return;
    setContacting(true);
    try {
      const res = await contactCommunityListingSeller(id);
      if (res.seller?.vitana_id) {
        navigate(`/u/${res.seller.vitana_id}`);
      }
    } catch {
      notifyError("toasts.communityMarketplace.contactSellerFailed");
    } finally {
      setContacting(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title={`${listing.title} | VITANA`}
        description={listing.description.slice(0, 200)}
        canonical={typeof window !== "undefined" ? window.location.href : undefined}
        image={listing.images?.[0] ?? undefined}
      />

      <div className="p-4 md:p-6 min-h-screen">
        <div className="max-w-3xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("screens.communityMarketplace.back")}
          </Button>

          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative">
                  <CommunityListingImage
                    src={listing.images?.[0]}
                    alt={listing.title}
                    listingKind={listing.listing_kind}
                    sizeClass="w-full h-72 md:h-full"
                    className="md:rounded-l-xl"
                  />
                  {listing.status === "sold" && (
                    <Badge className="absolute top-3 right-3 bg-foreground text-background">
                      {t("screens.communityMarketplace.statusSold")}
                    </Badge>
                  )}
                  {listing.status === "paused" && (
                    <Badge variant="secondary" className="absolute top-3 right-3">
                      {t("screens.communityMarketplace.statusPaused")}
                    </Badge>
                  )}
                </div>

                <div className="p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {categoryLabel(listing.category)}
                    </span>
                    <h1 className="text-2xl font-semibold leading-tight">{listing.title}</h1>

                    <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                      {listing.condition && (
                        <Badge variant="secondary">{t(CONDITION_LABEL_KEYS[listing.condition])}</Badge>
                      )}
                      {listing.location_text && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {listing.location_text}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {listing.view_count}
                      </span>
                    </div>

                    <div className="text-3xl font-bold pt-2">
                      {priceText ?? t("screens.communityMarketplace.priceOnRequest")}
                    </div>

                    {listing.delivery_method !== "not_applicable" && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Truck className="w-4 h-4" /> {t(DELIVERY_LABEL_KEYS[listing.delivery_method])}
                      </div>
                    )}
                    {listing.is_remote_service && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Store className="w-4 h-4" /> {t("screens.communityMarketplace.remoteService")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    {seller && (
                      <Link
                        to={seller.vitana_id ? `/u/${seller.vitana_id}` : "#"}
                        className="flex items-center gap-2 rounded-xl bg-muted/40 hover:bg-muted/60 p-2.5 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name ?? ""} />
                          <AvatarFallback>{(seller.display_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">{t("screens.communityMarketplace.postedBy")}</div>
                          <div className="text-sm font-medium flex items-center gap-1 truncate">
                            {seller.display_name ?? seller.vitana_id}
                            {seller.verification_status === "verified" && (
                              <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      </Link>
                    )}

                    {isOwner ? (
                      <Button asChild size="lg" className="w-full">
                        <Link to={`/discover/community-marketplace/${listing.id}/edit`}>
                          {t("screens.communityMarketplace.editButton")}
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        onClick={handleContactSeller}
                        disabled={contacting || listing.status === "sold"}
                        size="lg"
                        className="w-full"
                      >
                        {contacting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                        {t("screens.communityMarketplace.contactSeller")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-2">
              <h2 className="text-lg font-semibold">{t("screens.communityMarketplace.aboutThisListing")}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {listing.description}
              </p>
            </CardContent>
          </Card>

          <Separator />
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            {t("screens.communityMarketplace.postedTimeAgo", {
              time: formatDistanceToNow(new Date(listing.created_at), { addSuffix: true }),
            })}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
