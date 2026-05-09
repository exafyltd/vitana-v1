import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Heart, MessageCircle, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

interface ContentItem {
  id: string;
  type: 'post' | 'media';
  title: string;
  preview?: string;
  thumbnail?: string;
  engagement: {
    likes?: number;
    comments?: number;
    views?: number;
  };
  timestamp: string;
}

interface FeaturedContentCarouselProps {
  content?: ContentItem[];
  className?: string;
}

const defaultContent: ContentItem[] = [
  {
    id: '1',
    type: 'post',
    title: '30-Day Wellness Challenge Completed!',
    preview: 'Just finished my 30-day wellness journey and the results are amazing! Sharing my experience and key takeaways...',
    engagement: { likes: 124, comments: 23 },
    timestamp: '2 days ago'
  },
  {
    id: '2',
    type: 'media',
    title: 'Morning Yoga Flow Routine',
    thumbnail: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400',
    engagement: { views: 1842, likes: 89 },
    timestamp: '1 week ago'
  },
  {
    id: '3',
    type: 'post',
    title: 'Plant-Based Nutrition Guide',
    preview: 'Everything you need to know about transitioning to a plant-based diet for better health and wellness...',
    engagement: { likes: 156, comments: 34 },
    timestamp: '2 weeks ago'
  }
];

export function FeaturedContentCarousel({ content, className }: FeaturedContentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const displayContent = content && content.length > 0 ? content : defaultContent;

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % displayContent.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayContent.length) % displayContent.length);
  };

  const currentItem = displayContent[currentIndex];

  return (
    <Card className={`rounded-2xl shadow-sm overflow-hidden ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(var(--pill-nutrition-accent))]" />
            {t('screens.profile.featuredContent')}
          </div>
          {displayContent.length > 1 && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={prev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={next}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative group cursor-pointer">
          {currentItem.type === 'media' && currentItem.thumbnail && (
            <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden">
              <img
                src={currentItem.thumbnail}
                alt={currentItem.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-3 right-3 bg-black/50 text-white border-0 backdrop-blur-sm">
                {t('screens.profile.video')}
              </Badge>
            </div>
          )}
          
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground mb-2 line-clamp-1">
                {currentItem.title}
              </h4>
              {currentItem.preview && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {currentItem.preview}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentItem.timestamp}</span>
              <div className="flex gap-4">
                {currentItem.engagement.views && (
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{currentItem.engagement.views.toLocaleString()}</span>
                  </div>
                )}
                {currentItem.engagement.likes && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    <span>{currentItem.engagement.likes}</span>
                  </div>
                )}
                {currentItem.engagement.comments && (
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{currentItem.engagement.comments}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Dots indicator */}
        {displayContent.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 pt-4 border-t border-muted/30">
            {displayContent.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'w-6 bg-[hsl(var(--pill-nutrition-accent))]' 
                    : 'w-1.5 bg-muted'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
