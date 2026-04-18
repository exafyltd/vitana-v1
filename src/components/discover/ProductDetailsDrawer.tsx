/**
 * VTID-02000: Product details side drawer — mirrors the events drawer pattern.
 * - Desktop: right-side Sheet
 * - Mobile: bottom Drawer
 * Opens when useProductSelection().selectedProduct is set.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  MapPin,
  ExternalLink,
  Gift,
  Leaf,
  Target,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProductSelection } from "@/context/ProductSelectionContext";
import { formatPrice, getRedirectUrl } from "@/hooks/useMarketplace";
import { ProductImage } from "@/components/discover/ProductImage";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function ProductDetailsDrawer() {
  const { selectedProduct, clearSelection } = useProductSelection();
  const isMobile = useIsMobile();
  const open = !!selectedProduct;

  const content = selectedProduct ? <DrawerBody /> : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && clearSelection()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{selectedProduct?.title ?? "Product"}</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && clearSelection()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{selectedProduct?.title ?? "Product"}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody() {
  const { selectedProduct: p } = useProductSelection();
  if (!p) return null;

  const hasDiscount =
    p.compare_at_price_cents &&
    p.price_cents &&
    p.compare_at_price_cents > p.price_cents;
  const matchReasons = p.match_reasons?.filter((r) => r.text) ?? [];
  const ingredients = Array.isArray(p.ingredients_primary) ? p.ingredients_primary : [];
  const goals = Array.isArray(p.health_goals) ? p.health_goals : [];
  const dietary = Array.isArray(p.dietary_tags) ? p.dietary_tags : [];
  const redirectUrl = getRedirectUrl(p.id, "product-drawer");

  return (
    <div className="flex flex-col h-full pb-24 md:pb-0">
      {/* Hero */}
      <div className="relative">
        <ProductImage
          src={p.images?.[0]}
          alt={p.title}
          category={p.category}
          subcategory={p.subcategory}
          sizeClass="w-full h-64 md:h-72"
        />
        {p.availability && p.availability !== "in_stock" && (
          <Badge className="absolute top-3 right-3 bg-red-500 text-white">
            {p.availability === "out_of_stock" ? "Out of Stock" : p.availability}
          </Badge>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Title block */}
        <div>
          {p.brand && (
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {p.brand}
            </div>
          )}
          <h2 className="text-xl md:text-2xl font-semibold leading-tight">{p.title}</h2>
          <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {p.rating !== null && p.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-medium text-foreground">{p.rating.toFixed(1)}</span>
                {p.review_count ? <span>({p.review_count.toLocaleString()})</span> : null}
              </span>
            )}
            {p.origin_country && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {p.origin_country}
              </span>
            )}
            {p.subcategory && <Badge variant="secondary">{p.subcategory}</Badge>}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatPrice(p.price_cents, p.currency)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(p.compare_at_price_cents, p.currency)}
                </span>
              )}
            </div>
            {p.reward_preview?.points_estimate ? (
              <div className="flex items-center gap-1 text-xs text-emerald-700 mt-1">
                <Gift className="w-3.5 h-3.5" />
                Earn +{p.reward_preview.points_estimate} points on purchase
              </div>
            ) : null}
          </div>
        </div>

        {/* Match reasons */}
        {matchReasons.length > 0 && (
          <section className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              <Sparkles className="w-4 h-4" /> Why this for you
            </h3>
            <ul className="space-y-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
              {matchReasons.slice(0, 5).map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{r.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Description */}
        {p.description && (
          <section>
            <h3 className="text-sm font-semibold mb-2">About this product</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {p.description}
            </p>
          </section>
        )}

        {/* Health goals */}
        {goals.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Target className="w-4 h-4 text-muted-foreground" /> Supports
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g) => (
                <Badge key={g} variant="secondary" className="capitalize">
                  {g.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Ingredients */}
        {ingredients.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <Leaf className="w-4 h-4 text-muted-foreground" /> Key ingredients
            </h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {ingredients.map((ing) => (
                <li key={ing} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span className="capitalize">{ing.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Dietary badges */}
        {dietary.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Dietary
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {dietary.map((t) => (
                <Badge key={t} variant="outline" className="capitalize">
                  {t.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Directions: dosage + serving size + servings per container */}
        {(p.dosage || p.serving_size || p.servings_per_container) && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" /> Directions
            </h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {p.dosage && (
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Dose</div>
                  <div className="font-medium leading-tight">{p.dosage}</div>
                </div>
              )}
              {p.serving_size && (
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Serving</div>
                  <div className="font-medium leading-tight">{p.serving_size}</div>
                </div>
              )}
              {p.servings_per_container != null && (
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Servings</div>
                  <div className="font-medium leading-tight">{p.servings_per_container}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Safety notes */}
        {p.safety_notes && (
          <section className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200/60 dark:border-amber-900/40">
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4" /> Safety &amp; interactions
            </h3>
            <p className="text-sm text-amber-900/90 dark:text-amber-100/90 whitespace-pre-line leading-relaxed">
              {p.safety_notes}
            </p>
          </section>
        )}

        {/* Evidence links */}
        {Array.isArray(p.evidence_links) && p.evidence_links.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" /> Evidence
            </h3>
            <ul className="space-y-2 text-sm">
              {p.evidence_links.map((e, i) => (
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
          </section>
        )}

        <Separator />

        <p className="text-xs text-muted-foreground leading-relaxed">
          This product card is informational. Always consult a qualified practitioner before
          starting a new supplement, especially if you are pregnant, nursing, or on medication.
        </p>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur px-5 py-3 flex gap-2">
        <AddToCartButton
          item={{
            item_type: "product",
            item_id: p.id,
            item_name: p.title,
            item_price: p.price_cents ? p.price_cents / 100 : 0,
            item_image_url: p.images?.[0],
            item_metadata: { brand: p.brand, category: p.category },
          }}
          size="default"
          className="flex-1"
        />
        <Button asChild variant="outline" className="flex-shrink-0">
          <a href={redirectUrl} target="_blank" rel="noopener noreferrer">
            Buy <ExternalLink className="w-4 h-4 ml-1.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
