import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Sparkles,
  ArrowLeft,
  Pill,
  Heart,
  Stethoscope,
  Tag
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import SEO from '@/components/SEO';
import StandardHeader from '@/components/StandardHeader';
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from '@/components/ui/split-bar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import useEmblaCarousel from 'embla-carousel-react';
import { useMarketplaceFeed, formatPrice, type MarketplaceProduct } from '@/hooks/useMarketplace';
import { ProductImage } from '@/components/discover/ProductImage';
import { ProductDetailsDrawer } from '@/components/discover/ProductDetailsDrawer';
import { ProductSelectionProvider, useProductSelection } from '@/context/ProductSelectionContext';
import { t } from '@/lib/i18n-toast';

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  price: string;
  match: number;
  reason: string;
  provider: string;
  image: string | null;
  badge: string;
  type?: 'service' | 'supplement' | 'expert' | 'deal';
  category?: string | null;
  subcategory?: string | null;
  _product?: MarketplaceProduct;
}

export default function AIPicksPage() {
  return (
    <ProductSelectionProvider>
      <AIPicksInner />
    </ProductSelectionProvider>
  );
}

function AIPicksInner() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const { selectProduct } = useProductSelection();
  const [activeFilter, setActiveFilter] = useState('all');
  const [error, setError] = useState(false);

  const { data: feedData, isLoading } = useMarketplaceFeed({ limit: 24 });
  
  // Embla carousel for mobile horizontal scroll
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    containScroll: 'trimSnaps'
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // AI Recommendations from the marketplace feed — lifecycle-aware, personalized,
  // limitations-filtered server-side. 'deal' type is inferred from compare_at_price.
  const aiRecommendations: AIRecommendation[] = useMemo(
    () => (feedData?.items ?? []).map((p) => {
      const match = Math.round(((p.match_score ?? p.rank_score ?? 0.7) * 100));
      const hasDiscount =
        p.compare_at_price_cents != null &&
        p.price_cents != null &&
        p.compare_at_price_cents > p.price_cents;
      return {
        id: p.id,
        title: p.title,
        description: p.description ?? '',
        price: formatPrice(p.price_cents, p.currency),
        match,
        reason: p.match_reasons?.[0]?.text ?? p.rank_reasons?.[0] ?? '',
        provider: p.brand ?? 'Vitana Shop',
        image: p.images?.[0] ?? null,
        badge: match >= 80 ? t('discover.matchPerfect') : match >= 60 ? t('discover.matchGreat') : t('discover.matchGood'),
        type: hasDiscount ? 'deal' : 'supplement',
        category: p.category,
        subcategory: p.subcategory,
        _product: p,
      };
    }),
    [feedData]
  );

  // Error fallback handling
  useEffect(() => {
    if (error) {
      toast({
        title: translate('discover.aiPicks.unavailable'),
        description: translate('discover.aiPicks.unavailableDesc'),
        variant: "destructive"
      });
      navigate('/discover');
    }
  }, [error, toast, navigate, translate]);

  // Update carousel index on scroll
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  // Filter recommendations based on active filter
  const filteredRecommendations = activeFilter === 'all' 
    ? aiRecommendations 
    : aiRecommendations.filter(rec => rec.type === activeFilter);

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'service': return <Heart className="h-3 w-3" />;
      case 'supplement': return <Pill className="h-3 w-3" />;
      case 'expert': return <Stethoscope className="h-3 w-3" />;
      case 'deal': return <Tag className="h-3 w-3" />;
      default: return <Sparkles className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'service': return 'bg-blue-500';
      case 'supplement': return 'bg-green-500';
      case 'expert': return 'bg-purple-500';
      case 'deal': return 'bg-orange-500';
      default: return 'bg-primary';
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'service': return translate('discover.filters.services');
      case 'supplement': return translate('discover.filters.supplements');
      case 'expert': return translate('discover.filters.experts');
      case 'deal': return translate('discover.filters.deals');
      default: return translate('discover.filters.all');
    }
  };

  // Card component for reuse
  const RecommendationCard = ({ rec }: { rec: AIRecommendation }) => {
    const productCents = rec._product?.price_cents ?? 0;
    return (
      <Card
        onClick={() => rec._product && selectProduct(rec._product)}
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200/50 dark:border-purple-800/50 overflow-hidden h-full"
      >
        <div className="relative">
          <ProductImage
            src={rec.image}
            alt={rec.title}
            category={rec.category}
            subcategory={rec.subcategory}
            sizeClass="w-full h-40"
          />
          <Badge className="absolute top-2 left-2 bg-purple-500 text-white text-xs">
            {rec.badge}
          </Badge>
          <div className="absolute top-2 right-2 bg-white/90 dark:bg-background/90 rounded-full px-2 py-1">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{rec.match}%</span>
          </div>
          <div className={cn(
            "absolute bottom-2 left-2 rounded-full px-2 py-1 flex items-center gap-1 text-white text-xs",
            getTypeColor(rec.type)
          )}>
            {getTypeIcon(rec.type)}
            <span>{getTypeLabel(rec.type)}</span>
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {rec.title}
          </h3>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>

          {rec.reason && (
            <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-500" />
                <span className="text-xs text-purple-700 dark:text-purple-300 line-clamp-1">{rec.reason}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-bold">{rec.price}</span>
            <span className="text-xs text-muted-foreground truncate max-w-[45%]">{rec.provider}</span>
          </div>

          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <AddToCartButton
              item={{
                item_type: 'product',
                item_id: rec.id,
                item_name: rec.title,
                item_price: productCents / 100,
                item_image_url: rec.image ?? undefined,
                item_metadata: { provider: rec.provider, match: rec.match, type: rec.type },
              }}
              size="sm"
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => rec._product && selectProduct(rec._product)}
            >
              {translate('discover.view')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <Brain className="h-12 w-12 text-purple-500 animate-bounce" />
            <p className="text-muted-foreground">{translate('discover.aiPicks.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO 
        title={t('screens.discover.aiPicksVitana')} 
        description="Personalized AI-powered recommendations based on your health data and goals"
        canonical={window.location.href} 
      />
      
      <div className={cn(
        "p-6 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background min-h-screen",
        isMobile && "px-4 pb-32"
      )}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back button for mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/discover')}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {translate('discover.aiPicks.backToDiscover')}
            </Button>
          )}

          <StandardHeader
            title={translate('discover.aiPicks.title')}
            description={translate('discover.aiPicks.description')}
            emoji="🧠"
          />

          {/* Filter Tabs */}
          <SplitBar value={activeFilter} onValueChange={setActiveFilter}>
            <SplitBarList className={cn(isMobile && "overflow-x-auto")}>
              <SplitBarTrigger value="all">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {translate('discover.filters.all')}
              </SplitBarTrigger>
              <SplitBarTrigger value="service">
                <Heart className="h-4 w-4 mr-1.5" />
                {translate('discover.filters.services')}
              </SplitBarTrigger>
              <SplitBarTrigger value="supplement">
                <Pill className="h-4 w-4 mr-1.5" />
                {translate('discover.filters.supplements')}
              </SplitBarTrigger>
              <SplitBarTrigger value="expert">
                <Stethoscope className="h-4 w-4 mr-1.5" />
                {translate('discover.filters.experts')}
              </SplitBarTrigger>
              <SplitBarTrigger value="deal">
                <Tag className="h-4 w-4 mr-1.5" />
                {translate('discover.filters.deals')}
              </SplitBarTrigger>
            </SplitBarList>
          </SplitBar>

          {/* Results count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4 text-purple-500" />
            <span>
              {translate('discover.aiPicks.recommendationsFound').replace('{count}', String(filteredRecommendations.length))}
            </span>
          </div>

          {/* Recommendations - Horizontal carousel on mobile, grid on desktop */}
          {isMobile ? (
            <>
              <div 
                ref={emblaRef} 
                className="overflow-hidden -mx-4"
                style={{ touchAction: 'pan-y pinch-zoom' }}
              >
                <div className="flex">
                  {filteredRecommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex-none w-[85vw] px-2 first:pl-4 last:pr-4"
                    >
                      <RecommendationCard rec={rec} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Dot indicators */}
              {filteredRecommendations.length > 1 && (
                <div className="flex justify-center items-center gap-1.5 mt-2">
                  {filteredRecommendations.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={cn(
                        "rounded-full transition-all duration-200",
                        index === currentIndex 
                          ? "w-5 h-1.5 bg-primary" 
                          : "w-1.5 h-1.5 bg-muted-foreground/30"
                      )}
                      onClick={() => emblaApi?.scrollTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRecommendations.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {filteredRecommendations.length === 0 && (
            <Card className="p-8 text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {translate('discover.aiPicks.noRecommendations')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {translate('discover.aiPicks.noRecommendationsDesc')}
              </p>
              <Button onClick={() => setActiveFilter('all')}>
                {translate('discover.aiPicks.viewAllPicks')}
              </Button>
            </Card>
          )}
        </div>
      </div>
      <ProductDetailsDrawer />
    </AppLayout>
  );
}
