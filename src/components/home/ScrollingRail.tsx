import { NewsCard, NewsCardProps } from '@/components/crossover/NewsCard';
import { cn } from '@/lib/utils';

interface ScrollingRailProps {
  items: NewsCardProps[];
  speed?: 'slow' | 'medium' | 'fast';
  className?: string;
}

export function ScrollingRail({ 
  items, 
  speed = 'medium',
  className = '' 
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
        className={cn("flex gap-4", speedClass)}
        style={{ width: 'fit-content' }}
      >
        {duplicatedItems.map((item, index) => (
          <div key={index} className="flex-shrink-0 w-[320px]">
            <NewsCard {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}
