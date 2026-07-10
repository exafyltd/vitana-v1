/**
 * VTID-02000: "See all" destination for a Discover thematic collection —
 * a focused, mobile-first vertical list matching the premium card language
 * (see PremiumProductCard.tsx / ProductListRow.tsx), instead of dropping
 * into the older, desktop-oriented Supplements.tsx browse screen.
 */

import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Leaf,
  Droplet,
  Shield,
  Gem,
  Sparkles,
  Brain,
  Zap,
  Clock,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { useTranslation } from "@/hooks/useTranslation";
import { useMarketplaceSearch } from "@/hooks/useMarketplace";
import { ProductListRow } from "@/components/discover/ProductListRow";
import { getPersonalizedReason, hasPersonalizationSignal } from "@/lib/discover-reason";
import { t } from "@/lib/i18n-toast";

interface SectionMeta {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  i18nKey: string;
}

const SECTION_META: Record<string, SectionMeta> = {
  longevity: { icon: Clock, gradient: "from-violet-500 to-purple-600", i18nKey: "longevity" },
  adaptogens: { icon: Leaf, gradient: "from-emerald-500 to-teal-600", i18nKey: "adaptogens" },
  vitamins: { icon: Sparkles, gradient: "from-sky-500 to-blue-600", i18nKey: "vitamins" },
  "essential-fatty-acids": { icon: Droplet, gradient: "from-amber-500 to-orange-600", i18nKey: "essentialFattyAcids" },
  minerals: { icon: Gem, gradient: "from-cyan-500 to-teal-600", i18nKey: "minerals" },
  immunity: { icon: Shield, gradient: "from-blue-500 to-indigo-600", i18nKey: "immunity" },
  beauty: { icon: Sparkles, gradient: "from-rose-500 to-pink-600", i18nKey: "beauty" },
  nootropics: { icon: Brain, gradient: "from-purple-500 to-fuchsia-600", i18nKey: "nootropics" },
  performance: { icon: Zap, gradient: "from-orange-500 to-red-600", i18nKey: "performance" },
  antioxidants: { icon: Leaf, gradient: "from-lime-500 to-green-600", i18nKey: "antioxidants" },
};

export default function CategoryProducts() {
  const navigate = useNavigate();
  const { subcategory = "" } = useParams();
  const { translate } = useTranslation();
  const meta = SECTION_META[subcategory];

  const { data, isLoading } = useMarketplaceSearch({
    category: "supplements",
    subcategory,
    sort: "rating",
    limit: 50,
  });

  const products = data?.items ?? [];
  const title = meta ? translate(`discover.subcategories.${meta.i18nKey}`) : subcategory;

  return (
    <AppLayout>
      <SEO title={title} description={title} canonical={window.location.href} />
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/50 bg-background/95 backdrop-blur px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={translate("discover.back")}
            className="p-1 -ml-1 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0",
              meta?.gradient ?? "from-indigo-500 to-slate-600"
            )}
          >
            {meta ? <meta.icon className="h-4 w-4 text-white" strokeWidth={2} /> : <Package className="h-4 w-4 text-white" strokeWidth={2} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight truncate">{title}</h1>
            {!isLoading && (
              <p className="text-xs text-muted-foreground">
                {translate("discover.productsFound").replace("{count}", String(products.length))}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
            ))
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              {translate("discover.noResults")}
            </div>
          ) : (
            products.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                badgeText={hasPersonalizationSignal(product) ? t("discover.vitanaPickBadge") : t("discover.popularBadge")}
                reasonText={getPersonalizedReason(product)}
                onClick={() => navigate(`/discover/product/${product.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
