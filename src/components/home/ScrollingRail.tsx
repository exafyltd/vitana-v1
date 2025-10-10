import { NewsCard, NewsCardProps } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';

interface ScrollingRailProps {
  items: NewsCardProps[];
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
  itemWidth?: number; // px
  itemHeightClass?: string; // tailwind height class e.g. 'h-56'
}

export function ScrollingRail({ 
  items, 
  speed = 'medium',
  className = '',
  itemWidth = 320,
  itemHeightClass = 'h-56',
}: ScrollingRailProps) {
  const speedClass = {
    slow: 'animate-scroll-slow',
    medium: 'animate-scroll-medium',
    fast: 'animate-scroll-fast'
  }[speed];

  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div 
        className={cn("flex gap-4 whitespace-nowrap will-change-transform", speedClass)}
        style={{ width: 'fit-content' }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={index} className={cn("flex-shrink-0", itemHeightClass)} style={{ width: `${itemWidth}px` }}>
            <NewsCard {...item} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
