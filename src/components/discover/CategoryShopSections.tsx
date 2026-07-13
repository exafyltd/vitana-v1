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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useMarketplaceSearch, type MarketplaceProduct } from "@/hooks/useMarketplace";
import { CompactProductCard } from "@/components/discover/PremiumProductCard";
import { getPersonalizedReason, hasPersonalizationSignal } from "@/lib/discover-reason";
import { t } from "@/lib/i18n-toast";

interface SectionMeta {
  /** Matches products.subcategory in the DB. */
  key: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  i18nKey: string;
}

/** One thematic-collections config per Discover product category. */
export const SECTION_CONFIGS: Record<string, SectionMeta[]> = {
  supplements: [
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
  ],
  skincare: [
    { key: "face-care", icon: Droplet, gradient: "from-pink-400 to-rose-500", i18nKey: "faceCare" },
    { key: "makeup", icon: Sparkles, gradient: "from-fuchsia-500 to-pink-600", i18nKey: "makeup" },
    { key: "hair-care", icon: Leaf, gradient: "from-amber-500 to-orange-600", i18nKey: "hairCare" },
    { key: "body-care", icon: Shield, gradient: "from-teal-500 to-cyan-600", i18nKey: "bodyCare" },
    { key: "fragrance", icon: Gem, gradient: "from-purple-500 to-violet-600", i18nKey: "fragrance" },
    { key: "sun-care", icon: Zap, gradient: "from-yellow-500 to-amber-600", i18nKey: "sunCare" },
  ],
};

const ITEMS_PER_SECTION = 6;
// Gateway's discover-search validates limit <= 50 (SearchQuerySchema); a
// higher value 400s the whole request, which surfaced as "No results found"
// since useMarketplaceSearch throws on a non-OK response.
const FETCH_LIMIT = 50;

interface CategoryShopSectionsProps {
  /** Discover product category to fetch thematic collections for. */
  category?: keyof typeof SECTION_CONFIGS;
  /** Optional heading rendered above the collections (e.g. "Skincare & Cosmetics"). */
  title?: string;
}

export function CategoryShopSections({ category = "supplements", title }: CategoryShopSectionsProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const sectionOrder = SECTION_CONFIGS[category] ?? [];

  const { data, isLoading } = useMarketplaceSearch({
    category,
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

  const sections = sectionOrder
    .map((meta) => ({ meta, products: bySubcategory.get(meta.key) ?? [] }))
    .filter((s) => s.products.length > 0);

  const goToProduct = (product: MarketplaceProduct) => {
    navigate(`/discover/product/${product.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {title && <h2 className="text-base font-semibold">{title}</h2>}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[20px] bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="space-y-3">
        {title && <h2 className="text-base font-semibold">{title}</h2>}
        <div className="text-center py-10 text-sm text-muted-foreground">
          {translate("discover.noResults")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {title && <h2 className="text-base font-semibold">{title}</h2>}
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
              onClick={() => navigate(`/discover/category/${meta.key}`)}
            >
              {translate("discover.seeAll")} <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>

          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-0.5 pb-1 -mx-0.5">
            {products.map((product) => (
              <CompactProductCard
                key={product.id}
                product={product}
                badgeText={hasPersonalizationSignal(product) ? t("discover.vitanaPickBadge") : t("discover.popularBadge")}
                reasonText={getPersonalizedReason(product)}
                onClick={() => goToProduct(product)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
