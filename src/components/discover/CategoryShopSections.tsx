import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Leaf,
  Droplet,
  Shield,
  Gem,
  Sparkles,
  Brain,
  Zap,
  Clock,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useMarketplaceSearch, formatPrice, type MarketplaceProduct } from "@/hooks/useMarketplace";
import { ProductImage } from "@/components/discover/ProductImage";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

interface SectionMeta {
  /** Matches products.subcategory in the DB. */
  key: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  i18nKey: string;
}

const SECTION_ORDER: SectionMeta[] = [
  { key: "longevity", icon: Clock, gradient: "from-violet-500 to-purple-600", i18nKey: "longevity" },
  { key: "adaptogens", icon: Leaf, gradient: "from-emerald-500 to-teal-600", i18nKey: "adaptogens" },
  { key: "vitamins", icon: Sparkles, gradient: "from-sky-500 to-blue-600", i18nKey: "vitamins" },
  { key: "essential-fatty-acids", icon: Droplet, gradient: "from-amber-500 to-orange-600", i18nKey: "essentialFattyAcids" },
  { key: "minerals", icon: Gem, gradient: "from-cyan-500 to-teal-600", i18nKey: "minerals" },
  { key: "immunity", icon: Shield, gradient: "from-blue-500 to-indigo-600", i18nKey: "immunity" },
  { key: "beauty", icon: Sparkles, gradient: "from-rose-500 to-pink-600", i18nKey: "beauty" },
  { key: "nootropics", icon: Brain, gradient: "from-purple-500 to-fuchsia-600", i18nKey: "nootropics" },
  { key: "performance", icon: Zap, gradient: "from-orange-500 to-red-600", i18nKey: "performance" },
  { key: "antioxidants", icon: Leaf, gradient: "from-lime-500 to-green-600", i18nKey: "antioxidants" },
];

const ITEMS_PER_SECTION = 6;
const FETCH_LIMIT = 60;

export function CategoryShopSections() {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const { data, isLoading } = useMarketplaceSearch({
    category: "supplements",
    sort: "rating",
    limit: FETCH_LIMIT,
  });

  const bySubcategory = new Map<string, MarketplaceProduct[]>();
  for (const p of data?.items ?? []) {
    const key = p.subcategory ?? "";
    if (!key) continue;
    const list = bySubcategory.get(key) ?? [];
    if (list.length < ITEMS_PER_SECTION) list.push(p);
    bySubcategory.set(key, list);
  }

  const sections = SECTION_ORDER
    .map((meta) => ({ meta, products: bySubcategory.get(meta.key) ?? [] }))
    .filter((s) => s.products.length > 0);

  const goToProduct = (product: MarketplaceProduct) => {
    navigate(`/discover/product/${product.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[20px] bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        {translate("discover.noResults")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sections.map(({ meta, products }) => (
        <div key={meta.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br", meta.gradient)}>
                <meta.icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold">
                {translate(`discover.subcategories.${meta.i18nKey}`)}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7 px-2"
              onClick={() => navigate(`/discover/supplements?category=${meta.key}`)}
            >
              {translate("discover.seeAll")} <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-0.5 pb-1 -mx-0.5">
            {products.map((product) => (
              <div
                key={product.id}
                role="button"
                tabIndex={0}
                aria-label={product.title}
                onClick={() => goToProduct(product)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToProduct(product);
                  }
                }}
                className="snap-start shrink-0 w-[132px] rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer overflow-hidden active:scale-[0.97] transition-transform"
              >
                <ProductImage
                  src={product.images?.[0]}
                  alt={product.title}
                  category={product.category}
                  subcategory={product.subcategory}
                  sizeClass="w-full h-[100px]"
                />
                <div className="p-2 space-y-1">
                  <p className="text-xs font-medium line-clamp-2 leading-snug">{product.title}</p>
                  {product.rating != null && (
                    <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                      {product.rating.toFixed(1)}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <span className="text-xs font-semibold">
                      {formatPrice(product.price_cents, product.currency)}
                    </span>
                    <AddToCartButton
                      item={{
                        item_type: "product",
                        item_id: product.id,
                        item_name: product.title,
                        item_price: (product.price_cents ?? 0) / 100,
                        item_image_url: product.images?.[0],
                        item_metadata: { brand: product.brand, category: product.subcategory },
                      }}
                      size="icon"
                      showLabel={false}
                      className="h-6 w-6 shrink-0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
