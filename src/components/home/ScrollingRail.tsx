import { useEffect, useRef, useState } from 'react';
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
  className = '',
}: ScrollingRailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(320);

  const speedClass = {
    slow: 'animate-scroll-slow',
    medium: 'animate-scroll-medium',
    fast: 'animate-scroll-fast'
  }[speed];

  useEffect(() => {
    const calculateCardWidth = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const gap = 16; // gap-4 = 1rem = 16px
      
      // Match the 12-column grid system breakpoints (no peek)
      let columns = 1; // base: 1 column
      if (window.innerWidth >= 768) columns = 2; // md
      if (window.innerWidth >= 1024) columns = 3; // lg
      if (window.innerWidth >= 1280) columns = 4; // xl (matches col-span-3 x 4)
      
      const width = (containerWidth - gap * (columns - 1)) / columns;
      setCardWidth(Math.floor(width));
    };

    calculateCardWidth();
    window.addEventListener('resize', calculateCardWidth);
    return () => window.removeEventListener('resize', calculateCardWidth);
  }, []);

  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden w-full max-w-full min-w-0 isolate", className)}
      style={{ contain: 'layout paint' }}
    >
      <div 
        className={cn("flex gap-4 whitespace-nowrap will-change-transform transform-gpu", speedClass)}
      >
        {duplicatedItems.map((item, index) => (
          <div key={index} className="flex-shrink-0 h-[280px]" style={{ width: `${cardWidth}px` }}>
            <NewsCard {...item} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
