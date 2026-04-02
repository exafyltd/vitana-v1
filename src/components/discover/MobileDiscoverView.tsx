import React from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddToCartButton } from '@/components/cart/AddToCartButton';
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

/** Premium recommendation card — featured (larger) or standard */
function RecommendationCard({ 
  rec, 
  featured = false,
  onNavigate 
}: { 
  rec: AIRecommendation; 
  featured?: boolean;
  onNavigate: (rec: AIRecommendation) => void;
}) {
  const { translate } = useTranslation();
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden cursor-pointer group transition-all duration-300",
        "rounded-[20px] bg-card border border-border/50",
        "shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10",
        featured ? "col-span-2" : ""
      )}
      onClick={() => onNavigate(rec)}
    >
      {/* Image with gradient overlay */}
      <div className={cn("relative overflow-hidden", featured ? "h-56" : "h-48")}>
        <img 
          src={rec.image} 
          alt={rec.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        {/* Badge top-left */}
        <Badge className={cn(
          "absolute top-3 left-3 border-0 text-white",
          "bg-gradient-to-r from-purple-500 to-fuchsia-500",
          featured ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5"
        )}>
          {rec.badge}
        </Badge>
        
        {/* Match % top-right */}
        <div className={cn(
          "absolute top-3 right-3 rounded-full px-2 py-1",
          "bg-white/15 backdrop-blur-md border border-white/20"
        )}>
          <span className={cn(
            "font-bold text-white",
            featured ? "text-sm" : "text-xs"
          )}>{rec.match}%</span>
        </div>
        
        {/* Title + provider overlaid on gradient */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className={cn(
            "font-semibold text-white line-clamp-2 mb-1",
            "drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
            featured ? "text-lg" : "text-base"
          )}>
            {rec.title}
          </h3>
          <p className="text-xs text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            {rec.provider}
          </p>
        </div>
      </div>
      
      {/* Content below image */}
      <div className={cn("p-3", featured && "p-4")}>
        {/* AI reason chip */}
        <div className="flex items-center gap-1.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg px-2.5 py-1.5 mb-3">
          <Sparkles className="h-3 w-3 text-purple-500 shrink-0" />
          <span className="text-xs text-purple-700 dark:text-purple-300 line-clamp-1">{rec.reason}</span>
        </div>
        
        {/* Price + actions */}
        <div className="flex items-center justify-between">
          <span className={cn("font-bold", featured ? "text-xl" : "text-lg")}>{rec.price}</span>
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
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onNavigate(rec); }}>
              {translate('discover.view')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileDiscoverView({ aiRecommendations, activeTab = 'suggested' }: MobileDiscoverViewProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const mobileCategories = categoryConfig.map(cat => ({
    ...cat,
    title: translate(`discover.categories.${cat.id}`)
  }));

  const handleNavigate = (rec: AIRecommendation) => {
    navigate(`/discover/product/${rec.id}`, { state: rec });
  };

  // AI Picks tab
  if (activeTab === 'suggested') {
    const featured = aiRecommendations[0];
    const rest = aiRecommendations.slice(1);

    return (
      <div className="space-y-1">
        {/* Section header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
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
        {featured && (
          <RecommendationCard rec={featured} featured onNavigate={handleNavigate} />
        )}

        {/* Secondary section divider */}
        {rest.length > 0 && (
          <>
            <div className="flex items-center gap-3 pt-4 pb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">
                {translate('discover.moreToExplore')}
              </span>
              <div className="h-[1px] flex-1 bg-border/50" />
            </div>

            {/* 2-column grid for remaining */}
            <div className="grid grid-cols-2 gap-3">
              {rest.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} onNavigate={handleNavigate} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Categories tab
  if (activeTab === 'categories') {
    return (
      <div className="space-y-3">
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
        
        <div className="grid grid-cols-2 gap-3">
          {mobileCategories.map((category) => (
            <div 
              key={category.id}
              className={cn(
                "relative overflow-hidden rounded-[20px] cursor-pointer",
                "bg-card border border-border/50 p-4",
                "shadow-lg shadow-purple-500/5",
                "active:scale-[0.97] transition-all duration-200"
              )}
              onClick={() => navigate(category.path)}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-3",
                "bg-gradient-to-br", category.color
              )}>
                <category.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-sm font-semibold">{category.title}</h3>
            </div>
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
