import React, { useState, useEffect, useRef, useMemo } from 'react';
import VirtualizedList from '@/components/ui/virtualized-list';
import { StandardHorizontalCard, StandardHorizontalCardProps } from './standard-horizontal-card';
import { VisualHorizontalCard, VisualHorizontalCardProps } from './visual-horizontal-card';
import { cn } from '@/lib/utils';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { Skeleton } from '@/components/ui/skeleton';

interface HorizontalCardListProps<T extends StandardHorizontalCardProps | VisualHorizontalCardProps> {
  items: T[];
  variant: 'standard' | 'visual';
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
  const hasLoggedView = useRef(false);
  
  // Disable virtualization when any card is expanded
  const shouldVirtualize = expandedCards.size === 0 && (enableVirtualization ?? items.length >= 30);
  
  const actualItemHeight = itemHeight || (variant === 'standard' ? 80 : 140);
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

  // Infinite scroll observer - fires load_more analytics
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
      { rootMargin: `${loadMoreThreshold}px` }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, onLoadMore, hasMore, isLoading, loadMoreThreshold, screenId, listId, items.length]);

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
      <div className="text-center py-12 text-muted-foreground">
        No items to display
      </div>
    );
  }

  const gapClass = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4'
  }[gap];

  return (
    <div className={cn("w-full", className)}>
      {groupedItems.map((group, groupIdx) => (
        <div key={groupIdx} className="mb-6">
          {group.label && (
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 mb-2 mt-4 first:mt-0">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h3>
            </div>
          )}

          {shouldVirtualize ? (
            <VirtualizedList
              items={group.items}
              itemHeight={actualItemHeight}
              height={actualContainerHeight}
              renderItem={renderCard}
              className={gapClass}
            />
          ) : (
            <div className={gapClass}>
              {group.items.map((item, idx) => renderCard(item, idx))}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className={gapClass}>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {infiniteScroll && hasMore && (
        <div ref={sentinelRef} className="h-4" />
      )}
    </div>
  );
}
