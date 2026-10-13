/**
 * VTID-05108 — the stage of the desktop News focus feed (Spotlight on).
 *
 * One column, free scrolling (no scroll-snap). The card crossing the stage's
 * centre line is the focused one (useFocusedCard); its neighbours are dimmed —
 * only their media is softened, text keeps full contrast (WCAG AA). J/K and
 * ↑/↓ move to the next/previous card. Loading shows archetype-shaped VCard
 * skeletons, never a spinner (SR-20).
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VCardSkeleton } from '@/components/ui/vcard';
import { useFocusedCard } from '@/components/layout/spotlight';
import { FeedItemErrorBoundary } from '@/components/feed/FeedItemErrorBoundary';
import { t } from '@/lib/i18n-toast';
import { STANDARD_ROW_SKELETON_CLASS, type StageCardState } from './focusCardUtils';
import type { StageItem } from './focusFeedModel';

export const FOCUS_ITEM_SELECTOR = '[data-focus-item]';

/** Mounted only while News is the visible screen, so J/K never act on a hidden feed. */
function FocusController({ stageRef, onFocusChange }: { stageRef: RefObject<HTMLElement>; onFocusChange: (i: number) => void }) {
  const { focusedIndex } = useFocusedCard(stageRef, FOCUS_ITEM_SELECTOR);
  useEffect(() => {
    onFocusChange(focusedIndex);
  }, [focusedIndex, onFocusChange]);
  return null;
}

export interface NewsFocusStageProps {
  items: StageItem[];
  renderItem: (item: StageItem, state: StageCardState) => ReactNode;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  /** False while News is kept alive behind another screen. */
  active: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  /** Show "You're all caught up" once nothing more loads (not on the Community tab, as today). */
  showEnd?: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
}

export function NewsFocusStage({
  items,
  renderItem,
  focusedIndex,
  onFocusChange,
  active,
  isLoading,
  isFetchingMore,
  hasMore,
  showEnd = true,
  onLoadMore,
  onRefresh,
}: NewsFocusStageProps) {
  const stageRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(onLoadMore);
  loadMoreRef.current = onLoadMore;

  // Endless scroll: its own sentinel, so it works however the page switched
  // between the legacy and the Spotlight layout.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined' || !active) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, items.length]);

  const fallback = (
    <div className="rounded-vcard border bg-card px-4 py-6 text-center text-sm text-muted-foreground">{t('screens.home.feedItemError')}</div>
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4" data-focus-feed="" aria-busy="true">
        <VCardSkeleton size="spotlight" />
        <VCardSkeleton size="standard" className={STANDARD_ROW_SKELETON_CLASS} />
        <VCardSkeleton size="standard" className={STANDARD_ROW_SKELETON_CLASS} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-vcard border bg-card px-6 py-12 text-center" data-focus-feed="">
        <p className="text-lg text-muted-foreground">{t('screens.home.noNewsArticlesYet')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('screens.home.articlesWillAppearOnceFeedSources')}</p>
        <Button variant="outline" className="mt-4" onClick={onRefresh}>
          <RefreshCw className="me-2 h-4 w-4" aria-hidden="true" />
          {t('screens.home.refresh')}
        </Button>
      </div>
    );
  }

  return (
    <section ref={stageRef} aria-label={t('spotlightFeed.stage.label')} data-focus-feed="">
      {active && <FocusController stageRef={stageRef} onFocusChange={onFocusChange} />}
      <ol className="flex flex-col gap-4">
        {items.map((item, i) => (
          <li key={item.key}>
            <FeedItemErrorBoundary fallback={fallback}>
              {renderItem(item, {
                size: i === 0 ? 'spotlight' : 'standard',
                focused: i === focusedIndex,
                dimmed: i !== focusedIndex,
              })}
            </FeedItemErrorBoundary>
          </li>
        ))}
      </ol>
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      {isFetchingMore && (
        <div className="mt-4" aria-busy="true">
          <VCardSkeleton size="standard" className={STANDARD_ROW_SKELETON_CLASS} />
        </div>
      )}
      {showEnd && !hasMore && !isFetchingMore && <p className="py-8 text-center text-sm text-muted-foreground">{t('screens.home.youReAllCaughtUp')}</p>}
    </section>
  );
}
