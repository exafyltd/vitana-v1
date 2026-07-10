import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Sparkles,
  ChevronRight,
  Moon,
  Apple,
  Dumbbell,
  Heart,
  Pill,
  Stethoscope,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import { type MarketplaceProduct } from '@/hooks/useMarketplace';
import { CategoryShopSections } from '@/components/discover/CategoryShopSections';
import { FeaturedProductCard, CompactProductCard } from '@/components/discover/PremiumProductCard';
import { getPersonalizedReason, hasPersonalizationSignal } from '@/lib/discover-reason';
import { VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';
import { t } from '@/lib/i18n-toast';

interface AIRecommendation {
  id: number;
  title: string;
  description: string;
  price: string;
  match: number;
  reason: string;
  provider: string;
  image: string;
  badge: string;
  // Real marketplace product behind this card (VTID-02000). Carries the true
  // products.id used for navigation + cart + the affiliate Buy redirect; the
  // legacy numeric `id` above is only a render key.
  _product?: MarketplaceProduct;
}

interface MobileDiscoverViewProps {
  aiRecommendations: AIRecommendation[];
  activeTab?: string;
}

// Category config without titles (titles come from translations)
const categoryConfig = [
  { id: 'sleep', icon: Moon, color: 'from-indigo-500 to-indigo-600', path: '/discover/wellness-services' },
  { id: 'nutrition', icon: Apple, color: 'from-green-500 to-green-600', path: '/discover/supplements' },
  { id: 'movement', icon: Dumbbell, color: 'from-orange-500 to-orange-600', path: '/discover/wellness-services' },
  { id: 'mind', icon: Brain, color: 'from-purple-500 to-purple-600', path: '/discover/wellness-services' },
  { id: 'supplements', icon: Pill, color: 'from-pink-500 to-pink-600', path: '/discover/supplements' },
  { id: 'experts', icon: Stethoscope, color: 'from-blue-500 to-blue-600', path: '/discover/doctors-coaches' },
];

export function MobileDiscoverView({ aiRecommendations, activeTab = 'suggested' }: MobileDiscoverViewProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const mobileCategories = categoryConfig.map(cat => ({
    ...cat,
    title: translate(`discover.categories.${cat.id}`)
  }));

  const handleNavigate = (rec: AIRecommendation) => {
    // Navigate by the REAL product id. The detail page (/discover/product/:id)
    // loads strictly from the API by id, so the legacy numeric `rec.id`
    // (a render index) produced "Product not found". Use the marketplace
    // product's UUID when present.
    const productId = rec._product?.id ?? String(rec.id);
    navigate(`/discover/product/${productId}`, { state: rec });
  };

  // Vitana Picks tab — featured hero + horizontally-scrollable collections,
  // all within one vertically-scrolling page.
  if (activeTab === 'suggested') {
    const featured = aiRecommendations[0]?._product ? aiRecommendations[0] : undefined;
    const rest = aiRecommendations.slice(1).filter((rec) => rec._product);

    return (
      <div className="space-y-6">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={VITANA_BOT_AVATAR_URL}
              alt={t('screens.vitanaIdentity.orbAlt')}
              width={20}
              height={20}
              className="rounded-full shrink-0"
            />
            <h2 className="text-base font-semibold">{translate('discover.recommendedForYou')}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7 px-2"
            onClick={() => navigate('/discover/ai-picks')}
          >
            {translate('discover.seeAll')} <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        {/* Featured hero recommendation */}
        {featured?._product && (
          <FeaturedProductCard
            product={featured._product}
            badgeText={hasPersonalizationSignal(featured._product) ? t('discover.vitanaPickBadge') : t('discover.popularBadge')}
            reasonText={getPersonalizedReason(featured._product)}
            onClick={() => handleNavigate(featured)}
          />
        )}

        {/* More to explore — horizontal scroll */}
        {rest.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                {translate('discover.moreToExplore')}
              </span>
              <div className="h-[1px] flex-1 bg-border/50" />
            </div>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-0.5 pb-1 -mx-0.5">
              {rest.map((rec) => (
                <CompactProductCard
                  key={rec.id}
                  product={rec._product!}
                  badgeText={hasPersonalizationSignal(rec._product!) ? t('discover.vitanaPickBadge') : t('discover.popularBadge')}
                  reasonText={getPersonalizedReason(rec._product!)}
                  onClick={() => handleNavigate(rec)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Thematic collections — Longevity, Adaptogens, Sleep & Recovery, etc. */}
        <CategoryShopSections />
      </div>
    );
  }

  // Categories tab
  if (activeTab === 'categories') {
    const nonProductCategories = mobileCategories.filter(
      (c) => c.id !== 'nutrition' && c.id !== 'supplements'
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{translate('discover.browseCategories')}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7 px-2"
            onClick={() => navigate('/discover/supplements')}
          >
            {translate('discover.all')} <LayoutGrid className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        <CategoryShopSections />

        {/* Non-product categories (services & experts) stay reachable as compact chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {nonProductCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => navigate(category.path)}
              className={cn(
                "flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5",
                "bg-card border border-border/50 text-xs font-medium",
                "active:scale-[0.97] transition-transform"
              )}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br",
                category.color
              )}>
                <category.icon className="h-3 w-3 text-white" />
              </span>
              {category.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Share & Earn tab — show CTA card
  if (activeTab === 'share') {
    return (
      <div className="space-y-3">
        <div className="rounded-[20px] overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-200/30 dark:border-purple-800/30 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{translate('discover.shareAndEarn')}</h3>
              <p className="text-xs text-muted-foreground">{translate('discover.shareAndEarnDesc')}</p>
            </div>
          </div>
          <Button 
            className="w-full rounded-xl"
            onClick={() => navigate('/discover')}
          >
            {translate('discover.start')}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
