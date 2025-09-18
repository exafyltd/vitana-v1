import React, { useCallback, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  height: number;
  className?: string;
  renderItem: (item: any, index: number) => React.ReactNode;
  onScrollToTop?: () => void;
  scrollThreshold?: number;
}

// Simple virtualized list implementation without external dependencies
const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight,
  height,
  className,
  renderItem,
  onScrollToTop,
  scrollThreshold = 100,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const offset = e.currentTarget.scrollTop;
    setScrollTop(offset);
    
    if (offset <= scrollThreshold && onScrollToTop) {
      onScrollToTop();
    }
  }, [scrollThreshold, onScrollToTop]);

  // Calculate which items are visible
  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(height / itemHeight) + 2; // +2 for buffer
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {items.slice(startIndex, endIndex).map((item, index) => {
          const actualIndex = startIndex + index;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: actualIndex * itemHeight,
                width: '100%',
                minHeight: itemHeight,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedList;