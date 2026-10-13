import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import { t } from '@/lib/i18n-toast';

/**
 * VTID-05109 — the Discover utility-row pills on Spotlight screens: the same
 * pills, in the same order, as the legacy desktop row (search · calendar ·
 * Action), with the search now WIRED (`onSearch`) — the legacy pill had no
 * handler (plan §1, SR-26).
 */
export function DiscoverUtilityActions({
  searchPlaceholder,
  onSearch,
  onAction,
  searchKey,
}: {
  /** Changing it remounts (collapses and empties) the search pill. */
  searchKey?: number;
  searchPlaceholder: string;
  onSearch: (q: string) => void;
  /** Omit on screens whose legacy row has no Action button (Orders). */
  onAction?: () => void;
}) {
  return (
    <>
      <ExpandableSearchButton key={searchKey} placeholder={searchPlaceholder} onSearch={onSearch} />
      <UniversalCalendarButton />
      {onAction && (
        <Button size="sm" className="gap-2" onClick={onAction}>
          <Plus className="size-4" />
          <span>{t('screens.discover.action')}</span>
        </Button>
      )}
    </>
  );
}

/** The legacy desktop row's trailing refresh button, kept for parity. */
export function DiscoverRefreshButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={() => window.location.reload()}
      title={t('screens.discover.refreshPage')}
      aria-label={t('screens.discover.refreshPage')}
    >
      <RefreshCw className="size-4" />
    </Button>
  );
}
