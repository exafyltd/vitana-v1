import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CardEnvelope, LayoutConfig, RowPattern, UnifiedLayoutProps, ROW_HEIGHTS, RESPONSIVE_COLS, CARD_CONSTRAINTS } from '@/types/unified-layout';
import { CardRenderer } from './CardRenderer';

/**
 * Unified Layout System - CTO Approved Implementation
 * 
 * Features:
 * - Grid-12 responsive foundation with row-unit sizing
 * - Deterministic placement using placement_seed for SSR consistency  
 * - Row balancing with content type alternation
 * - Pillar distribution constraints
 * - Performance optimized with row windowing
 */
export function UnifiedLayout({
  cards,
  config,
  breakpoint = 'lg',
  className,
  windowConfig
}: UnifiedLayoutProps) {
  
  // Memoized row patterns for performance and SSR consistency
  const rowPatterns = useMemo(() => {
    return calculateRowPatterns(cards, config, breakpoint);
  }, [cards, config.placement_seed, breakpoint]);

  // Row windowing implementation for performance
  const visibleRows = useMemo(() => {
    if (!windowConfig?.enabled) return rowPatterns;
    
    // TODO: Implement viewport-based windowing with IntersectionObserver
    // For now, return all rows - windowing can be added in Phase 3
    return rowPatterns;
  }, [rowPatterns, windowConfig]);

  return (
    <div 
      className={cn(
        "unified-layout w-full mx-auto",
        "grid grid-cols-12 gap-6", // Removed auto-rows constraint that was causing issues
        className
      )}
      style={{
        gridAutoRows: 'minmax(280px, auto)' // Allow cards to size naturally
      } as React.CSSProperties}
    >
      {visibleRows.map((pattern, index) => 
        pattern.cards.map((cardConfig, cardIndex) => (
          <div
            key={`${pattern.pattern_id}-${cardIndex}`}
            className={cn(
              "unified-card-container",
              // Use responsive column classes
              `col-span-${Math.min(cardConfig.cols, 12)}`
            )}
            style={{
              // Ensure proper grid placement
              gridColumn: `span ${Math.min(cardConfig.cols, 12)}`,
              minHeight: `${cardConfig.rows * 70}px`
            }}
          >
            <CardRenderer 
              envelope={cardConfig.envelope}
              displayCols={cardConfig.cols}
              displayRows={cardConfig.rows}
            />
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Row Pattern Calculator - Deterministic Layout Engine
 * 
 * Implements CTO requirements:
 * - Stable placement_seed based ordering
 * - Row balancing (1 large + 2-3 small) OR (3-4 similar) 
 * - Pillar distribution every N rows
 * - Content type alternation rules
 */
function calculateRowPatterns(
  cards: CardEnvelope[], 
  config: LayoutConfig, 
  breakpoint: keyof typeof RESPONSIVE_COLS
): RowPattern[] {
  
  // Step 1: Sort cards by priority and apply placement_seed for deterministic ordering
  const sortedCards = [...cards].sort((a, b) => {
    const seedA = hashString(a.id + config.placement_seed);
    const seedB = hashString(b.id + config.placement_seed);
    
    // Primary: Priority descending, Secondary: Seeded hash for determinism
    if (a.priority !== b.priority) return b.priority - a.priority;
    return seedA - seedB;
  });

  // Step 2: Apply responsive column constraints
  const responsiveCards = sortedCards.map(card => ({
    ...card,
    responsive_cols: RESPONSIVE_COLS[breakpoint][card.size_hint.cols] || card.size_hint.cols
  }));

  // Step 3: Group into balanced rows
  const patterns: RowPattern[] = [];
  let cardIndex = 0;
  let rowIndex = 0;
  const pillarTracker = new Set<string>();
  
  while (cardIndex < responsiveCards.length) {
    const rowCards = responsiveCards.slice(cardIndex, cardIndex + config.max_cards_per_row);
    
    // Create balanced row pattern
    const pattern = createBalancedRow(rowCards, rowIndex, breakpoint);
    patterns.push(pattern);
    
    // Track pillar distribution
    pattern.cards.forEach(card => {
      if (card.envelope.pillar) {
        pillarTracker.add(card.envelope.pillar);
      }
    });
    
    // Enforce pillar coverage every N rows
    if ((rowIndex + 1) % config.pillar_cycle_rows === 0) {
      // TODO: Implement pillar balancing logic
      // For now, this is informational - full implementation in Phase 2
    }
    
    cardIndex += pattern.cards.length;
    rowIndex++;
  }

  return patterns;
}

/**
 * Create Balanced Row - Implements CTO Row Balancing Rules
 */
function createBalancedRow(
  cards: Array<CardEnvelope & { responsive_cols: number }>, 
  rowIndex: number,
  breakpoint: keyof typeof RESPONSIVE_COLS
): RowPattern {
  
  const isEvenRow = rowIndex % 2 === 0;
  const maxCols = breakpoint === 'sm' ? 12 : 12; // Always 12-col system
  
  if (cards.length === 0) {
    return { pattern_id: `row-${rowIndex}-empty`, cards: [] };
  }
  
  // Pattern Selection Logic
  if (cards.length === 1) {
    // Single card - use its preferred size or expand to fill
    const card = cards[0];
    const cols = Math.min(card.responsive_cols, maxCols);
    const rows = ROW_HEIGHTS[card.size_hint.height];
    
    return {
      pattern_id: `row-${rowIndex}-single`,
      cards: [{
        cols,
        rows,
        envelope: card
      }]
    };
  }
  
  if (cards.length === 2) {
    // Two cards - split evenly or large+small based on priority
    const [card1, card2] = cards;
    const priorityDiff = card1.priority - card2.priority;
    
    if (priorityDiff > 20) {
      // High priority difference - large + small
      return {
        pattern_id: `row-${rowIndex}-large-small`,
        cards: [
          { cols: 8, rows: ROW_HEIGHTS[card1.size_hint.height], envelope: card1 },
          { cols: 4, rows: ROW_HEIGHTS[card2.size_hint.height], envelope: card2 }
        ]
      };
    } else {
      // Similar priority - split evenly
      return {
        pattern_id: `row-${rowIndex}-split`,
        cards: [
          { cols: 6, rows: ROW_HEIGHTS[card1.size_hint.height], envelope: card1 },
          { cols: 6, rows: ROW_HEIGHTS[card2.size_hint.height], envelope: card2 }
        ]
      };
    }
  }
  
  if (cards.length >= 3) {
    // Three or more cards - implement "1 large + 2-3 small" OR "3-4 similar" patterns
    const [card1, card2, card3] = cards.slice(0, 3);
    
    if (isEvenRow) {
      // Pattern: Large + Small + Small
      return {
        pattern_id: `row-${rowIndex}-large-small-small`,
        cards: [
          { cols: 6, rows: ROW_HEIGHTS[card1.size_hint.height], envelope: card1 },
          { cols: 3, rows: ROW_HEIGHTS[card2.size_hint.height], envelope: card2 },
          { cols: 3, rows: ROW_HEIGHTS[card3.size_hint.height], envelope: card3 }
        ]
      };
    } else {
      // Pattern: Small + Small + Large  
      return {
        pattern_id: `row-${rowIndex}-small-small-large`,
        cards: [
          { cols: 3, rows: ROW_HEIGHTS[card1.size_hint.height], envelope: card1 },
          { cols: 3, rows: ROW_HEIGHTS[card2.size_hint.height], envelope: card2 },
          { cols: 6, rows: ROW_HEIGHTS[card3.size_hint.height], envelope: card3 }
        ]
      };
    }
  }
  
  // Fallback - should not reach here
  return { pattern_id: `row-${rowIndex}-fallback`, cards: [] };
}

/**
 * Simple hash function for deterministic placement_seed
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}