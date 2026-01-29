import React, { useState, useEffect } from 'react';
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
  type?: 'service' | 'supplement' | 'expert' | 'deal';
}

export default function AIPicksPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { translate } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Embla carousel for mobile horizontal scroll
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    containScroll: 'trimSnaps'
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // AI Recommendations Data with types
  const aiRecommendations: AIRecommendation[] = [
    {
      id: 1,
      title: "Sleep Optimization Program",
      description: "AI-detected poor sleep patterns based on your recent diary entries",
      price: "$199",
      match: 95,
      reason: "Low sleep scores detected",
      provider: "Dr. Emily Chen",
      image: "/lovable-uploads/sarah-miller-avatar.jpg",
      badge: "Perfect Match",
      type: 'service'
    },
    {
      id: 2,
      title: "Stress Management Coaching",
      description: "1-on-1 sessions to reduce cortisol levels",
      price: "$89",
      match: 92,
      reason: "High stress indicators",
      provider: "Marcus Rodriguez",
      image: "/lovable-uploads/james-davis-avatar.jpg",
      badge: "High Priority",
      type: 'expert'
    },
    {
      id: 3,
      title: "Iron-Rich Nutrition Plan",
      description: "Custom meal plan targeting iron deficiency",
      price: "$149",
      match: 90,
      reason: "Low iron biomarkers",
      provider: "Luna Wellness",
      image: "/lovable-uploads/se-hun-oh-avatar.jpg",
      badge: "Great Match",
      type: 'service'
    },
    {
      id: 4,
      title: "Adaptogen Supplement Bundle",
      description: "Natural stress relief supplements",
      price: "$79",
      match: 85,
      reason: "Stress management goal",
      provider: "Vitana Shop",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      badge: "Good Match",
      type: 'supplement'
    },
    {
      id: 5,
      title: "Vitamin D3 + K2 Complex",
      description: "Optimal absorption formula for bone health",
      price: "$45",
      match: 88,
      reason: "Vitamin D deficiency detected",
      provider: "Vitana Shop",
      image: "/lovable-uploads/emma-wilson-avatar.jpg",
      badge: "Recommended",
      type: 'supplement'
    },
    {
      id: 6,
      title: "Dr. Sarah Kim - Longevity Specialist",
      description: "Board certified in preventive medicine",
      price: "$250/session",
      match: 91,
      reason: "Matches your health goals",
      provider: "Vitana Network",
      image: "/lovable-uploads/dr-roberts-avatar.jpg",
      badge: "Top Rated",
      type: 'expert'
    },
    {
      id: 7,
      title: "20% Off Wellness Bundle",
      description: "Limited time offer on bestselling supplements",
      price: "$159",
      match: 82,
      reason: "Based on your wishlist",
      provider: "Vitana Shop",
      image: "/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png",
      badge: "Deal",
      type: 'deal'
    },
    {
      id: 8,
      title: "Magnesium Glycinate",
      description: "Premium bioavailable magnesium for sleep & recovery",
      price: "$32",
      match: 87,
      reason: "Sleep optimization support",
      provider: "Vitana Shop",
      image: "/lovable-uploads/tae-min-avatar.jpg",
      badge: "Popular",
      type: 'supplement'
    }
  ];

  // Simulate loading and potential error
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
  const RecommendationCard = ({ rec }: { rec: AIRecommendation }) => (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200/50 dark:border-purple-800/50 overflow-hidden h-full"
    >
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
        {/* Type indicator */}
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
        
        {/* AI Reason Highlight */}
        <div className="bg-purple-50 dark:bg-purple-950/30 p-2 rounded-lg mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-purple-500" />
            <span className="text-xs text-purple-700 dark:text-purple-300 line-clamp-1">{rec.reason}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold">{rec.price}</span>
          <span className="text-xs text-muted-foreground">{rec.provider}</span>
        </div>
        
        <div className="flex gap-2">
          <AddToCartButton
            item={{
              item_type: rec.type === 'supplement' ? 'product' : 'wellness_service',
              item_id: rec.id.toString(),
              item_name: rec.title,
              item_price: parseFloat(rec.price.replace(/[$,/session]/g, '')),
              item_image_url: rec.image,
              item_metadata: { provider: rec.provider, match: rec.match, type: rec.type }
            }}
            size="sm"
            className="flex-1"
          />
          <Button 
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/discover/product/${rec.id}`, { state: rec })}
          >
            {translate('discover.view')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
        title="AI Picks | VITANA" 
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
    </AppLayout>
  );
}
