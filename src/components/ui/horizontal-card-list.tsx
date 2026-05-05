import React, { useState, useEffect, useRef, useMemo } from 'react';
import VirtualizedList from '@/components/ui/virtualized-list';
import { StandardHorizontalCard, StandardHorizontalCardProps } from './standard-horizontal-card';
import { VisualHorizontalCard, VisualHorizontalCardProps } from './visual-horizontal-card';
import { HorizontalCardSkeleton } from './horizontal-card-skeleton';
import { cn } from '@/lib/utils';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { t } from '@/lib/i18n-toast';

interface HorizontalCardListProps<T extends StandardHorizontalCardProps | VisualHorizontalCardProps> {
  items: T[];
  variant: 'standard' | 'visual';
  layout?: 'stack' | 'rail';
  groupBy?: 'date' | 'category' | 'none';
  groupLabels?: {
    today?: string;
    yesterday?: string;
    thisWeek?: string;
    older?: string;
  };
  infiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  loadMoreThreshold?: number;
  enableVirtualization?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  allowMultipleExpanded?: boolean;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  listId?: string;
  screenId: string;
}

export function HorizontalCardList<T extends StandardHorizontalCardProps | VisualHorizontalCardProps>(
  props: HorizontalCardListProps<T>
) {
  const {
    items,
    variant,
    layout = 'stack',
    groupBy = 'none',
    groupLabels,
    infiniteScroll = false,
    onLoadMore,
    hasMore,
    isLoading,
    loadMoreThreshold = 200,
    enableVirtualization,
    itemHeight,
    containerHeight,
    allowMultipleExpanded = false,
    emptyState,
    errorState,
    className,
    gap = 'md',
    listId,
    screenId
  } = props;

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLoggedView = useRef(false);
  
  // Disable virtualization when any card is expanded
  const shouldVirtualize = expandedCards.size === 0 && (enableVirtualization ?? items.length >= 30);
  
  // Use responsive heights based on screen size
  const isXL = typeof window !== 'undefined' && window.innerWidth >= 1280;
  const actualItemHeight = itemHeight || (variant === 'standard' 
    ? (isXL ? 84 : 88) 
    : (isXL ? 152 : 160)
  );
  const actualContainerHeight = containerHeight || 
    (typeof window !== 'undefined' ? window.innerHeight - 200 : 600);

  // Fire list view event on mount
  useEffect(() => {
    if (!hasLoggedView.current && items.length > 0) {
      horizontalCardAnalytics.listView({
        screenId,
        listId: listId || `${screenId}_list`,
        itemCount: items.length
      });
      hasLoggedView.current = true;
    }
  }, [items.length, screenId, listId]);

  // Infinite scroll observer - fires load_more analytics with 600px rootMargin
  useEffect(() => {
    if (!infiniteScroll || !sentinelRef.current || !onLoadMore || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          horizontalCardAnalytics.listLoadMore({
            screenId,
            listId: listId || `${screenId}_list`,
            newItemCount: items.length
          });
          onLoadMore();
        }
      },
      { 
        root: layout === 'rail' ? scrollRef.current : null,
        rootMargin: layout === 'rail' ? '0px 600px 0px 0px' : '600px'
      }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, onLoadMore, hasMore, isLoading, screenId, listId, items.length, layout]);

  const handleToggleExpand = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      
      if (!allowMultipleExpanded) {
        next.clear();
      }
      
      if (prev.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      
      return next;
    });
  };

  const groupedItems = useMemo(() => {
    if (groupBy === 'none') return [{ label: null, items }];
    
    if (groupBy === 'date') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const groups = {
        today: [] as T[],
        yesterday: [] as T[],
        thisWeek: [] as T[],
        older: [] as T[]
      };

      items.forEach(item => {
        const itemDate = new Date(item.timestamp || Date.now());
        if (itemDate.toDateString() === today.toDateString()) {
          groups.today.push(item);
        } else if (itemDate.toDateString() === yesterday.toDateString()) {
          groups.yesterday.push(item);
        } else if (itemDate > weekAgo) {
          groups.thisWeek.push(item);
        } else {
          groups.older.push(item);
        }
      });

      return [
        { label: groupLabels?.today || 'Today', items: groups.today },
        { label: groupLabels?.yesterday || 'Yesterday', items: groups.yesterday },
        { label: groupLabels?.thisWeek || 'This Week', items: groups.thisWeek },
        { label: groupLabels?.older || 'Older', items: groups.older }
      ].filter(group => group.items.length > 0);
    }
    
    const categoryMap = new Map<string, T[]>();
    items.forEach(item => {
      const category = (item as any).category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(item);
    });
    
    return Array.from(categoryMap.entries()).map(([label, items]) => ({ label, items }));
  }, [items, groupBy, groupLabels]);

  const renderCard = (item: T, index: number) => {
    const commonProps = {
      isExpanded: expandedCards.has(item.id),
      onToggleExpand: handleToggleExpand
    };

    if (variant === 'standard') {
      return (
        <StandardHorizontalCard
          key={item.id}
          {...(item as StandardHorizontalCardProps)}
          {...commonProps}
          layoutMode={layout === 'rail' ? 'rail' : undefined}
        />
      );
    } else {
      return (
        <VisualHorizontalCard
          key={item.id}
          {...(item as VisualHorizontalCardProps)}
          {...commonProps}
        />
      );
    }
  };

  if (items.length === 0 && !isLoading) {
    return emptyState || (
      <div className="text-center py-12 text-muted-foreground">{t('screens.ui.noItemsDisplay')}
      </div>
    );
  }

  const gapClass = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }[gap];

  return (
    <div className={cn("w-full", className)}>
      {layout === 'stack' ? (
        // Stack mode - vertical list
        <div className="w-full max-w-[1200px] mx-auto px-4">
          {groupedItems.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6">
              {group.label && (
                <div className="text-[12px] font-medium text-muted-foreground/80 uppercase tracking-wide py-1.5 px-2 h-8 flex items-center mb-2">
                  {group.label}
                </div>
              )}
              <div className={cn("flex flex-col", gapClass)}>
                {group.items.map((item, idx) => renderCard(item, idx))}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className={cn("flex flex-col", gapClass)}>
              <HorizontalCardSkeleton variant={variant} count={3} />
            </div>
          )}

          {infiniteScroll && hasMore && (
            <div ref={sentinelRef} className="h-4" />
          )}
        </div>
      ) : (
        // Rail mode - HORIZONTAL scrolling
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
          role="list"
          aria-label={listId || screenId}
        >
          <div className={cn("flex items-stretch", gapClass)}>
            {groupedItems[0].items.map((item) => (
              <div 
                key={item.id} 
                className="snap-start flex-shrink-0 min-w-[360px] xl:min-w-[380px]"
              >
                {renderCard(item, 0)}
              </div>
            ))}
            {infiniteScroll && hasMore && (
              <div ref={sentinelRef} className="w-px h-px" />
            )}
          </div>
          {isLoading && (
            <div className="flex gap-3 mt-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 min-w-[360px] xl:min-w-[380px]">
                  <HorizontalCardSkeleton variant={variant} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
