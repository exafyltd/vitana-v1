import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { VisualHorizontalCard, VisualHorizontalCardProps } from '@/components/ui/visual-horizontal-card';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { t } from '@/lib/i18n-toast';

interface HorizontalVisualCardsScrollProps {
  items: VisualHorizontalCardProps[];
  screenId: string;
  listId?: string;
  className?: string;
  cardWidth?: 'sm' | 'md' | 'lg';
}

export function HorizontalVisualCardsScroll({
  items,
  screenId,
  listId = 'horizontal-visual-cards',
  className,
  cardWidth = 'md'
}: HorizontalVisualCardsScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const widthClass = {
    sm: 'min-w-[320px] max-w-[320px]',
    md: 'min-w-[360px] max-w-[380px]',
    lg: 'min-w-[420px] max-w-[440px]'
  }[cardWidth];

  useEffect(() => {
    // Log list view when component mounts
    if (items.length > 0) {
      horizontalCardAnalytics.listView({
        screenId,
        listId,
        itemCount: items.length
      });
    }
  }, [screenId, listId, items.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scrollRef.current) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('keydown', handleKeyDown);
      return () => scrollElement.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <div 
        ref={scrollRef}
        className="flex gap-4 xl:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide"
        role="list"
        aria-label={t('screens.ui.autopilotActions')}
        tabIndex={0}
      >
        {items.map((item) => (
          <div 
            key={item.id} 
            className={cn("snap-start flex-shrink-0", widthClass)}
            role="listitem"
          >
            <VisualHorizontalCard {...item} />
          </div>
        ))}
      </div>
    </div>
  );
}
