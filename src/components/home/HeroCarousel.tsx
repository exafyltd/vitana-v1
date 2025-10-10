import { useState, useEffect, useMemo } from 'react';
import { NewsCard, NewsCardProps } from '@/components/crossover/NewsCard';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Autoplay } from '@/lib/embla-autoplay-plugin';

interface HeroCarouselProps {
  items: NewsCardProps[];
  autoplayInterval?: number;
  className?: string;
}

export function HeroCarousel({ 
  items, 
  autoplayInterval = 6000,
  className = '' 
}: HeroCarouselProps) {
  const [api, setApi] = useState<any>();
  const [current, setCurrent] = useState(0);

  const autoplayPlugin = useMemo(() => Autoplay({ 
    delay: autoplayInterval,
    stopOnInteraction: true,
    stopOnMouseEnter: true 
  }), [autoplayInterval]);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect();

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <div className={`relative ${className}`}>
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        plugins={[autoplayPlugin]}
        setApi={setApi}
        className="w-full"
        onMouseEnter={() => autoplayPlugin.stop()}
        onMouseLeave={() => autoplayPlugin.play()}
      >
        <CarouselContent>
          {items.map((item, index) => (
            <CarouselItem key={index} className="min-h-[420px]">
              <NewsCard
                {...item}
                className="h-full"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                index === current 
                  ? 'w-8 bg-primary' 
                  : 'w-2 bg-primary/30 hover:bg-primary/50'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
}
