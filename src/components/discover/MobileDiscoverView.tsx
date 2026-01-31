import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
import useEmblaCarousel from 'embla-carousel-react';
import { useTranslation } from '@/hooks/useTranslation';

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
}

interface MobileDiscoverViewProps {
  aiRecommendations: AIRecommendation[];
}

// Category config without titles (titles come from translations)
const categoryConfig = [
  { id: 'sleep', icon: Moon, color: 'bg-indigo-500', path: '/discover/wellness-services' },
  { id: 'nutrition', icon: Apple, color: 'bg-green-500', path: '/discover/supplements' },
  { id: 'movement', icon: Dumbbell, color: 'bg-orange-500', path: '/discover/wellness-services' },
  { id: 'mind', icon: Brain, color: 'bg-purple-500', path: '/discover/wellness-services' },
  { id: 'supplements', icon: Pill, color: 'bg-pink-500', path: '/discover/supplements' },
  { id: 'experts', icon: Stethoscope, color: 'bg-blue-500', path: '/discover/doctors-coaches' },
];

export function MobileDiscoverView({ aiRecommendations }: MobileDiscoverViewProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    containScroll: 'trimSnaps'
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Build categories with translated titles
  const mobileCategories = categoryConfig.map(cat => ({
    ...cat,
    title: translate(`discover.categories.${cat.id}`)
  }));

  // Update current index on scroll
  React.useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
    };
    
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi]);

  return (
    <div className="space-y-6">
      {/* Section 1: AI Picks - Primary horizontal carousel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">{translate('discover.aiPicksForYou')}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/discover/ai-picks')}
          >
            {translate('discover.seeAll')} <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        {/* Full-width carousel */}
        <div 
          ref={emblaRef} 
          className="overflow-hidden -mx-6"
          style={{ touchAction: 'pan-y pinch-zoom' }}
        >
          <div className="flex">
            {aiRecommendations.map((rec, index) => (
              <div
                key={rec.id}
                className="flex-none w-[85vw] px-2 first:pl-6 last:pr-6"
              >
                <Card className="overflow-hidden border-purple-200/50 dark:border-purple-800/50 h-full">
                  <div className="relative">
                    <img 
                      src={rec.image} 
                      alt={rec.title}
                      className="w-full h-40 object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-purple-500 text-white text-xs">
                      {rec.badge}
                    </Badge>
                    <div className="absolute top-2 right-2 bg-white/90 dark:bg-background/90 rounded-full px-2 py-1">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{rec.match}%</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-base mb-1 line-clamp-1">{rec.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{rec.description}</p>
                    
                    {/* AI Reason Highlight */}
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg mb-3">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-xs text-purple-700 dark:text-purple-300 line-clamp-1">{rec.reason}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{rec.price}</span>
                      <div className="flex gap-2">
                        <AddToCartButton
                          item={{
                            item_type: 'wellness_service',
                            item_id: rec.id.toString(),
                            item_name: rec.title,
                            item_price: parseFloat(rec.price.replace('$', '')),
                            item_image_url: rec.image,
                            item_metadata: { provider: rec.provider, match: rec.match }
                          }}
                          size="sm"
                        />
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/discover/product/${rec.id}`, { state: rec })}
                        >
                          {translate('discover.view')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
        
        {/* Dot indicators */}
        {aiRecommendations.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-2">
            {aiRecommendations.map((_, index) => (
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
      </section>

      {/* Section 2: Suggested For You - Secondary horizontal scroll */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">{translate('discover.suggestedForYou')}</h2>
          </div>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
          {aiRecommendations.slice(0, 4).map((rec) => (
            <Card 
              key={`suggested-${rec.id}`}
              className="flex-none w-[140px] cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/discover/product/${rec.id}`, { state: rec })}
            >
              <div className="relative">
                <img 
                  src={rec.image} 
                  alt={rec.title}
                  className="w-full h-24 object-cover rounded-t-lg"
                />
                <div className="absolute bottom-1 right-1 bg-white/90 dark:bg-background/90 rounded-full px-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">{rec.match}%</span>
                </div>
              </div>
              <CardContent className="p-2">
                <h4 className="text-xs font-medium line-clamp-2 mb-1">{rec.title}</h4>
                <span className="text-sm font-bold">{rec.price}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 3: Categories - Compressed grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{translate('discover.browseCategories')}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/discover/supplements')}
          >
            {translate('discover.all')} <LayoutGrid className="h-3 w-3 ml-1" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {mobileCategories.map((category) => (
            <Card 
              key={category.id}
              className="cursor-pointer active:scale-[0.97] transition-transform"
              onClick={() => navigate(category.path)}
            >
              <CardContent className="p-3 flex flex-col items-center gap-2">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", category.color)}>
                  <category.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-center">{category.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 4: Quick Actions */}
      <section className="space-y-3">
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{translate('discover.shareAndEarn')}</h3>
                <p className="text-xs text-muted-foreground">{translate('discover.shareAndEarnDesc')}</p>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/discover')}
              >
                {translate('discover.start')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
