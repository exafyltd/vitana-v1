import * as React from 'react';
import type { VCardSize } from '@/components/ui/vcard';
import { cn } from '@/lib/utils';
import { splitFullRows } from './listHelpers';

/**
 * VTID-05110 — a grid that only ever renders full rows (contract SR-13): the
 * items that fill complete rows are `standard` cards; whatever is left over
 * (fewer than one row) follows as a `row` list. Nothing is hidden and no row
 * mixes card sizes (SR-11), so the old bento holes (empty `col-span` slots on
 * Community / Events) cannot come back.
 */
const COLS: Record<2 | 3, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3' };

export interface FullRowGridProps<T> {
  items: readonly T[];
  cols: 2 | 3;
  renderItem: (item: T, size: Extract<VCardSize, 'standard' | 'row'>) => React.ReactNode;
  className?: string;
}

export function FullRowGrid<T>({ items, cols, renderItem, className }: FullRowGridProps<T>) {
  const { grid, rest } = splitFullRows(items, cols);
  return (
    <div className={cn('flex flex-col gap-4', className)} data-full-row-grid="">
      {grid.length > 0 && <div className={cn('grid gap-4', COLS[cols])}>{grid.map((item) => renderItem(item, 'standard'))}</div>}
      {rest.length > 0 && <div className="flex flex-col gap-2">{rest.map((item) => renderItem(item, 'row'))}</div>}
    </div>
  );
}
