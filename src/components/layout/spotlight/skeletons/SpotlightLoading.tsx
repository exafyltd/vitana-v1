import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VCardSkeleton } from '@/components/ui/vcard';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';
import { t } from '@/lib/i18n-toast';
import { cn } from '@/lib/utils';
import type { Archetype } from '../archetypes';
import { ArchetypeSkeleton } from './ArchetypeSkeleton';

/**
 * Desktop-spotlight-finish (owner decision 3, 2026-10-16) — the one loading
 * state for a page or section that waits on data (contract SR-20 / SR-21).
 *
 * - Desktop with Spotlight on → `ArchetypeSkeleton archetype` (page-level) or
 *   `rows` × `VCardSkeleton size="row"` (in-section), rendered where the stage
 *   content goes, so the ScreenFrame chrome stays mounted.
 * - Phones (and Spotlight off) → the same parts in the page's single-column
 *   mobile shape; the TopAppBar and MobileBottomNav stay mounted.
 * - Both: `aria-busy`, a visually hidden "loading" label, never a spinner.
 * - `loading` given → the skeleton while true, then `children` with a 150 ms
 *   opacity fade (none under `prefers-reduced-motion`, as StageCrossFade).
 *   Without `loading` it renders the skeleton only (early-return branches).
 */
export interface SpotlightLoadingProps {
  /** page-level wait: the archetype of the screen that is loading */
  archetype?: Archetype;
  /** in-section wait (a list body, a tab, load more): this many row skeletons */
  rows?: number;
  /** when given, the skeleton shows while true and `children` fade in when false */
  loading?: boolean;
  className?: string;
  children?: ReactNode;
}

function Rows({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <VCardSkeleton key={i} size="row" />
      ))}
    </div>
  );
}

function MobileShape({ archetype, rows }: { archetype: Archetype; rows?: number }) {
  switch (archetype) {
    case 'focus-feed':
    case 'detail':
      return (
        <div className="flex flex-col gap-4">
          <VCardSkeleton size="spotlight" />
          <Rows count={3} />
        </div>
      );
    case 'collection':
    case 'workspace':
    case 'conversation':
      return <Rows count={rows ?? 6} />;
    case 'dashboard':
    case 'storefront':
      return (
        <div className="flex flex-col gap-4">
          <VCardSkeleton size="spotlight" />
          <div className="grid grid-cols-2 gap-3">
            <VCardSkeleton size="standard" />
            <VCardSkeleton size="standard" />
          </div>
        </div>
      );
    case 'form':
    case 'immersive':
      return <ArchetypeSkeleton archetype={archetype} />;
  }
}

export function SpotlightLoading({ archetype, rows, loading, className, children }: SpotlightLoadingProps) {
  const spotlight = useSpotlightEnabled();
  const reduce = useReducedMotion();

  if (loading === false) {
    if (reduce) return <>{children}</>;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: 'easeOut' }}>
        {children}
      </motion.div>
    );
  }

  const shape = archetype ?? 'detail';
  let body: ReactNode;
  if (rows !== undefined && archetype === undefined) body = <Rows count={rows} />;
  else if (spotlight) body = <ArchetypeSkeleton archetype={shape} />;
  else body = <MobileShape archetype={shape} rows={rows} />;

  return (
    <div
      aria-busy="true"
      data-archetype-skeleton={archetype ?? 'rows'}
      data-spotlight-loading={spotlight ? 'desktop' : 'mobile'}
      className={cn('w-full', className)}
    >
      <span className="sr-only">{t('loading.default')}</span>
      {body}
    </div>
  );
}
