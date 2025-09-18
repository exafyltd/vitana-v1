import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  height: number;
  className?: string;
  renderItem: (item: any, index: number) => React.ReactNode;
  onScrollToTop?: () => void;
  scrollThreshold?: number;
  overscan?: number;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight,
  height,
  className,
  renderItem,
  onScrollToTop,
  scrollThreshold = 100,
  overscan = 5,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isNearTop, setIsNearTop] = useState(false);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollOffset = e.currentTarget.scrollTop;
    setScrollTop(scrollOffset);
    
    const nearTop = scrollOffset <= scrollThreshold;
    
    if (nearTop !== isNearTop) {
      setIsNearTop(nearTop);
      
      if (nearTop && onScrollToTop) {
        onScrollToTop();
      }
    }
  }, [scrollThreshold, isNearTop, onScrollToTop]);

  // Calculate visible range
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(height / itemHeight) + overscan,
    items.length - 1
  );

  const visibleItems = items.slice(
    Math.max(0, startIndex - overscan),
    endIndex + 1
  );

  // Scroll to bottom when new items are added (for chat behavior)
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    scrollToBottom();
  }, [items.length, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const absoluteIndex = Math.max(0, startIndex - overscan) + index;
          return (
            <div
              key={absoluteIndex}
              style={{
                position: 'absolute',
                top: absoluteIndex * itemHeight,
                width: '100%',
                height: itemHeight,
              }}
            >
              {renderItem(item, absoluteIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedList;