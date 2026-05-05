import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Quote, TrendingUp, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { t } from '@/lib/i18n-toast';

interface SuccessStory {
  id: string;
  quote: string;
  author: {
    name: string;
    avatar: string;
    achievement: string;
  };
  metric: {
    type: string;
    improvement: string;
    icon: React.ReactNode;
  };
}

const mockStories: SuccessStory[] = [
  {
    id: "1",
    quote: "Joining Sarah's wellness challenges completely transformed my morning routine. I've never felt more energized!",
    author: {
      name: "Mike Chen",
      avatar: "/lovable-uploads/mike-thompson-avatar.jpg",
      achievement: "Lost 15 lbs"
    },
    metric: {
      type: "Vitana Index",
      improvement: "+127 points",
      icon: <TrendingUp className="h-3 w-3" />
    }
  },
  {
    id: "2", 
    quote: "Sarah's mindfulness posts helped me build a daily meditation practice. Such a supportive community member!",
    author: {
      name: "Emma Wilson",
      avatar: "/lovable-uploads/emma-wilson-avatar.jpg",
      achievement: "30-day streak"
    },
    metric: {
      type: "Sleep Quality",
      improvement: "+40% better",
      icon: <Heart className="h-3 w-3 text-[hsl(var(--domain-community-accent))]" />
    }
  },
  {
    id: "3",
    quote: "The nutrition tips and meal prep videos were exactly what I needed to start eating healthier consistently.",
    author: {
      name: "James Davis", 
      avatar: "/lovable-uploads/james-davis-avatar.jpg",
      achievement: "Nutrition goals"
    },
    metric: {
      type: "Energy Levels",
      improvement: "+65% increase",
      icon: <TrendingUp className="h-3 w-3" />
    }
  }
];

interface SuccessStoryCarouselProps {
  className?: string;
}

export function SuccessStoryCarousel({ className }: SuccessStoryCarouselProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStoryIndex((prev) => (prev + 1) % mockStories.length);
    }, 6000); // Change story every 6 seconds

    return () => clearInterval(interval);
  }, []);

  const currentStory = mockStories[currentStoryIndex];

  return (
    <Card className={`rounded-xl shadow-sm bg-gradient-to-br from-background via-background to-background/80 border-2 border-transparent bg-clip-padding backdrop-blur-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Quote Icon */}
          <div className="icon-community rounded-full p-3 flex-shrink-0">
            <Quote className="h-5 w-5" />
          </div>
          
          {/* Story Content */}
          <div className="flex-1 space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {t('screens.profile.successStory')}
                <Badge variant="outline" className="text-xs">{t('screens.profile.value0Length', { value0: currentStoryIndex + 1, length: mockStories.length })}</Badge>
              </h3>
              
              <blockquote className="text-foreground leading-relaxed italic">
                "{currentStory.quote}"
              </blockquote>
            </div>
            
            <div className="flex items-center justify-between">
              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-border/50">
                  <AvatarImage src={currentStory.author.avatar} alt={currentStory.author.name} />
                  <AvatarFallback>{currentStory.author.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm text-foreground">{currentStory.author.name}</div>
                  <div className="text-xs text-muted-foreground">{currentStory.author.achievement}</div>
                </div>
              </div>
              
              {/* Impact Metric */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {currentStory.metric.icon}
                  {currentStory.metric.type}
                </div>
                <div className="text-sm font-semibold text-[hsl(var(--sys-vitana-accent))]">
                  {currentStory.metric.improvement}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {mockStories.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStoryIndex(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentStoryIndex 
                  ? 'bg-[hsl(var(--domain-community-accent))] w-6' 
                  : 'bg-border hover:bg-muted-foreground/30 w-2'
              }`}
              aria-label={`View story ${index + 1}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
