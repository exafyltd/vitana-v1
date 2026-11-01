import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';

/**
 * VTID-05420 — contract SR-31 "Spotlight grid" (owner-approved layout,
 * 2026-10-31). Desktop Spotlight screens that opt in via
 * `ScreenFrame layout="spotlight-grid"` compose their stage with this:
 *
 *   ┌──────────────┬────┬────┬────┐
 *   │              │ t1 │ t2 │ t3 │   xl (≥1280): 5 columns, spotlight 2 (40%),
 *   │  Spotlight   ├────┼────┼────┤   tiles 3 x 2 beside it
 *   │              │ t4 │ t5 │ t6 │   lg (1024-1279): 4 columns, spotlight 2 (50%),
 *   ├──────────────┴────┴────┴────┤   tiles 2 x 3 beside it
 *   │  compact row (full width)    │
 *   └──────────────────────────────┘
 *
 * - Exactly one spotlight; at most 6 `standard` tiles (extra items are not
 *   rendered); one optional row of `compact` cards.
 * - Fewer tiles (SR-13 / D4): tiles are never fabricated; the spotlight keeps
 *   its 2 columns and spans only the tile rows that exist (min 1). 0 tiles →
 *   `empty` fills the tile area. The spotlight is never widened.
 * - DOM contract read by tests and staging specs:
 *   `[data-spotlight-grid] > [data-slot="spotlight" | "tiles" | "row"]`.
 * - Tailwind scale classes and logical properties only (RTL mirrors).
 */
export interface SpotlightGridRow {
  title: string;
  seeAllTo?: string;
  /** compact VCards */
  items: ReactNode[];
}

export interface SpotlightGridProps {
  /** section heading above the grid (already translated) */
  label?: string;
  /** optional "See all" link for the grid section */
  seeAllTo?: string;
  /** exactly one <VCard size="spotlight" spotlightLabel> (or its skeleton) */
  spotlight: ReactNode;
  /** 0..6 <VCard size="standard">; extra items beyond 6 are not rendered */
  tiles: ReactNode[];
  /** one full-width row; omitted or empty → not rendered */
  row?: SpotlightGridRow;
  /** shown in the tile area when tiles is empty (shared empty state) */
  empty?: ReactNode;
}

const MAX_TILES = 6;

// Static class maps so Tailwind sees every class (no string building).
// xl: 3 tiles per row → 1-2 rows; lg: 2 tiles per row → 1-3 rows.
const XL_ROW_SPAN: Record<number, string> = { 1: 'xl:row-span-1', 2: 'xl:row-span-2' };
const LG_ROW_SPAN: Record<number, string> = { 1: 'lg:row-span-1', 2: 'lg:row-span-2', 3: 'lg:row-span-3' };

function SeeAll({ to }: { to: string }) {
  return (
    <Link to={to} className="shrink-0 text-sm font-semibold text-primary hover:underline">
      {t('spotlight.grid.seeAll')}
    </Link>
  );
}

function SectionHeading({ title, seeAllTo }: { title: string; seeAllTo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold leading-snug">{title}</h2>
      {seeAllTo && <SeeAll to={seeAllTo} />}
    </div>
  );
}

export function SpotlightGrid({ label, seeAllTo, spotlight, tiles, row, empty }: SpotlightGridProps) {
  const shown = tiles.slice(0, MAX_TILES);
  const count = shown.length;
  const xlRows = Math.max(1, Math.ceil(count / 3));
  const lgRows = Math.max(1, Math.ceil(count / 2));
  const rowItems = row?.items ?? [];
  const hasRow = row !== undefined && rowItems.length > 0;

  return (
    <section className="flex flex-col gap-3">
      {label && <SectionHeading title={label} seeAllTo={seeAllTo} />}
      <div data-spotlight-grid="" className="grid grid-cols-1 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <div
          data-slot="spotlight"
          className={cn('grid min-w-0 lg:col-span-2 xl:col-span-2', LG_ROW_SPAN[lgRows], XL_ROW_SPAN[xlRows])}
        >
          {spotlight}
        </div>
        <div data-slot="tiles" className="contents">
          {count > 0
            ? shown.map((tile, i) => (
                <div key={i} className="grid min-w-0">
                  {tile}
                </div>
              ))
            : empty != null && <div className="min-w-0 lg:col-span-2 xl:col-span-3">{empty}</div>}
        </div>
        {hasRow && (
          <div data-slot="row" className="col-span-full flex flex-col gap-3 pt-2">
            {row.title && <SectionHeading title={row.title} seeAllTo={row.seeAllTo} />}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {rowItems.map((item, i) => (
                <div key={i} className="grid min-w-0">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
