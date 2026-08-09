/**
 * VTID-02000: Public product detail page at /discover/product/:id.
 *
 * Unlike the drawer (which lives in a context, is opened by card click, and
 * disappears when you navigate away), this page is a real URL that:
 *   - Deep-links from search engines, Slack unfurls, and friends-sharing-links
 *   - Carries SEO-friendly <title> and OG metadata
 *   - Loads the product by id from the API (no reliance on router state)
 *
 * Sections mirror the drawer. Staying in sync is intentional — same content,
 * different container.
 */

import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Star,
  MapPin,
  ExternalLink,
  Gift,
  Leaf,
  Target,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { UniversalShareButton } from "@/components/sharing/UniversalShareButton";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { RecommendButton } from "@/components/discover/RecommendButton";
import { ProductImage } from "@/components/discover/ProductImage";
import { AffiliateDisclosure } from "@/components/discover/AffiliateDisclosure";
import {
  useMarketplaceProduct,
  formatPrice,
  getRedirectUrl,
} from "@/hooks/useMarketplace";
import { getShareUrl } from "@/lib/shareUrl";
import { t } from '@/lib/i18n-toast';

import { fmtNumber } from '@/lib/locale-format';
function useRecommendationId(productId: string | undefined): string | null {
  const [searchParams] = useSearchParams();
  const urlRecId = searchParams.get("rec");

  useEffect(() => {
    if (urlRecId && productId) {
      sessionStorage.setItem(`vitana.rec.${productId}`, urlRecId);
    }
  }, [urlRecId, productId]);

  if (urlRecId) return urlRecId;
  if (!productId) return null;
  return sessionStorage.getItem(`vitana.rec.${productId}`);
}

export default function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useMarketplaceProduct(id);
  const recId = useRecommendationId(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 min-h-screen">
          <div className="max-w-5xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-96 bg-muted rounded-xl" />
              <div className="h-8 w-2/3 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-5/6 bg-muted rounded" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !data?.ok || !data.product) {
    return (
      <AppLayout>
        <SEO title={t('screens.discover.productNotFoundVitana')} description="This product is unavailable or has been removed." />
        <div className="p-6 min-h-screen flex items-center justify-center">
          <Card className="max-w-md text-center">
            <CardContent className="p-8 space-y-4">
              <h1 className="text-xl font-semibold">{t('screens.discover.productNotFound')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('screens.discover.productYouRsquoReLookingFor')}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>{t('screens.discover.goBack')}</Button>
                <Button asChild><Link to="/discover">{t('screens.discover.discoverMore')}</Link></Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const p = data.product;
  const hasDiscount =
    p.compare_at_price_cents != null &&
    p.price_cents != null &&
    p.compare_at_price_cents > p.price_cents;
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];
  const ingredients = Array.isArray(p.ingredients_primary) ? p.ingredients_primary : [];
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  const dietary = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
  const evidence = Array.isArray(p.evidence_links) ? p.evidence_links : [];
  // "product_detail" (underscore) matches the gateway's ATTRIBUTION_SURFACES
  // enum exactly — the previous "product-page" (hyphen) never matched, so
  // every click from this page silently fell through to the 'direct' default.
  const redirectUrl = getRedirectUrl(p.id, "product_detail", recId);
  const priceText = formatPrice(p.price_cents, p.currency);
  const compareAtText = formatPrice(p.compare_at_price_cents, p.currency);

  return (
    <AppLayout>
      <SEO
        title={`${p.title}${p.brand ? ` — ${p.brand}` : ""} | VITANA`}
        description={p.description?.slice(0, 200) ?? `${p.title} on Vitana marketplace.`}
        canonical={typeof window !== "undefined" ? window.location.href : undefined}
        image={p.images?.[0] ?? undefined}
      />

      <div className="p-4 md:p-6 pb-32 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-dvh">
        <div className="max-w-5xl mx-auto space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('screens.discover.back')}
          </Button>

          {/* Hero row: image + top-of-page summary */}
          <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative">
                  <ProductImage
                    src={p.images?.[0] ?? null}
                    alt={p.title}
                    category={p.category}
                    subcategory={p.subcategory}
                    sizeClass="w-full h-80 md:h-full"
                    className="md:rounded-l-xl"
                  />
                  {p.availability && p.availability !== "in_stock" && (
                    <Badge className="absolute top-3 right-3 bg-red-500 text-white">
                      {p.availability === "out_of_stock" ? "Out of Stock" : p.availability}
                    </Badge>
                  )}
                </div>

                <div className="p-6 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    {p.brand && (
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{p.brand}</div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-semibold leading-tight">{p.title}</h1>
                    <div className="flex items-center flex-wrap gap-3 text-sm text-muted-foreground">
                      {p.rating != null && p.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span className="font-medium text-foreground">{p.rating.toFixed(1)}</span>
                          {p.review_count ? <span>{t('screens.discover.value0Reviews', { value0: fmtNumber(p.review_count) })}</span> : null}
                        </span>
                      )}
                      {p.origin_country && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {p.origin_country}
                        </span>
                      )}
                      {p.subcategory && <Badge variant="secondary">{p.subcategory}</Badge>}
                    </div>

                    <div className="flex items-baseline gap-2 pt-2">
                      <span className="text-3xl font-bold">{priceText}</span>
                      {hasDiscount && (
                        <>
                          <span className="text-base text-muted-foreground line-through">{compareAtText}</span>
                          <Badge variant="destructive" className="ml-1">{t('screens.discover.saveValue02', { value0: Math.round((1 - (p.price_cents ?? 0) / (p.compare_at_price_cents ?? 1)) * 100) })}
                          </Badge>
                        </>
                      )}
                    </div>
                    {p.reward_preview?.points_estimate ? (
                      <div className="flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-300">
                        <Gift className="w-4 h-4" />{t('screens.discover.earnPoints_estimatePointsPurchase', { points_estimate: p.reward_preview.points_estimate })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex gap-2">
                      <AddToCartButton
                        item={{
                          item_type: "product",
                          item_id: p.id,
                          item_name: p.title,
                          item_price: p.price_cents ? p.price_cents / 100 : 0,
                          item_image_url: p.images?.[0],
                          item_metadata: { brand: p.brand, category: p.category },
                        }}
                        size="lg"
                        className="flex-1 min-w-[160px]"
                      />
                      <Button asChild variant="outline" size="lg" className="flex-shrink-0">
                        <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
                          {t('screens.discover.buy')} <ExternalLink className="w-4 h-4 ml-1.5" />
                        </a>
                      </Button>
                    </div>
                    <RecommendButton productId={p.id} variant="cta" size="lg" className="w-full" />
                    <div className="flex flex-wrap gap-2">
                      <BookmarkButton
                        className="static"
                        item={{
                          item_type: "product",
                          item_id: p.id,
                          item_name: p.title,
                          item_image_url: p.images?.[0],
                          item_metadata: { brand: p.brand, category: p.category },
                        }}
                      />
                      <UniversalShareButton
                        content={{
                          type: "product",
                          id: p.id,
                          title: p.title,
                          description: p.description ?? "",
                          image_url: p.images?.[0],
                          url: getShareUrl("product", p.id),
                        }}
                        variant="outline"
                        size="icon"
                        showLabel={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detail sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {(p.description_long || p.description) && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-2">
                    <h2 className="text-lg font-semibold">{t('screens.discover.aboutThisProduct')}</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                      {p.description_long || p.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {ingredients.length > 0 && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <Leaf className="w-5 h-5 text-muted-foreground" /> {t('screens.discover.keyIngredients')}
                    </h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm text-muted-foreground">
                      {ingredients.map((ing) => (
                        <li key={ing} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span className="capitalize">{ing.replace(/_/g, " ")}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {p.safety_notes && (
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40">
                  <CardContent className="p-6 space-y-2">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-5 h-5" /> {t('screens.discover.safetyAmpInteractions')}
                    </h2>
                    <p className="text-sm text-amber-900/90 dark:text-amber-100/90 whitespace-pre-line leading-relaxed">
                      {p.safety_notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {evidence.length > 0 && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                      <BookOpen className="w-5 h-5 text-muted-foreground" /> {t('screens.discover.evidence')}
                    </h2>
                    <ul className="space-y-2 text-sm">
                      {evidence.map((e, i) => (
                        e.url ? (
                          <li key={i} className="flex items-start gap-2">
                            <span aria-hidden className="text-muted-foreground mt-0.5">•</span>
                            <div className="flex-1">
                              <a
                                href={e.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline leading-snug"
                              >
                                {e.title ?? e.url}
                              </a>
                              {e.source_type && (
                                <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                                  {e.source_type.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                          </li>
                        ) : null
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {(p.dosage || p.serving_size || p.servings_per_container) && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" /> {t('screens.discover.directions')}
                    </h2>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {p.dosage && (
                        <div className="rounded-md bg-muted/50 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('screens.discover.dose')}</div>
                          <div className="font-medium leading-tight">{p.dosage}</div>
                        </div>
                      )}
                      {p.serving_size && (
                        <div className="rounded-md bg-muted/50 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('screens.discover.serving')}</div>
                          <div className="font-medium leading-tight">{p.serving_size}</div>
                        </div>
                      )}
                      {p.servings_per_container != null && (
                        <div className="rounded-md bg-muted/50 p-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t('screens.discover.servings')}</div>
                          <div className="font-medium leading-tight">{p.servings_per_container}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {goals.length > 0 && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <Target className="w-4 h-4 text-muted-foreground" /> {t('screens.discover.supports')}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {goals.map((g) => (
                        <Badge key={g} variant="secondary" className="capitalize">
                          {g.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {dietary.length > 0 && (
                <Card className="bg-white/85 dark:bg-card/85 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" /> {t('screens.discover.dietary')}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {dietary.map((t) => (
                        <Badge key={t} variant="outline" className="capitalize">
                          {t.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {matchReasons.length > 0 && (
                <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40">
                  <CardContent className="p-6 space-y-2">
                    <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">{t('screens.discover.whyThisForYou')}</h2>
                    <ul className="space-y-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
                      {matchReasons.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span>{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator />
          <div className="max-w-2xl space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">{t('screens.discover.thisProductCardInformationalAlwaysConsult2')}
            </p>
            <AffiliateDisclosure />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
