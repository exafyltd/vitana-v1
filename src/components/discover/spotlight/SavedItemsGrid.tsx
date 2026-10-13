import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VCardData } from '@/components/ui/vcard/adapters';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { BookmarkItemType, BookmarkedItem } from '@/types/bookmarks';
import { t } from '@/lib/i18n-toast';
import { DataVCard } from './DiscoverCards';
import { DiscoverEmpty, DiscoverGridSkeleton } from './DiscoverStates';
import { DISCOVER_GRID } from './storefront-model';

/**
 * VTID-05109 — the member's own saved items of one type (real
 * `bookmarked_items` rows) as a `standard` grid. This is the honest content
 * for the Discover sections whose catalog is still sample data: what the
 * member saved is real, the sample catalog is not shown.
 */
export function SavedItemsGrid({
  type,
  toCard,
  query,
  onOpen,
  emptyTitleKey,
  emptyDescriptionKey,
  Icon,
}: {
  type: BookmarkItemType;
  toCard: (b: BookmarkedItem) => VCardData;
  /** Utility-bar search text: filters the saved items by title. */
  query: string;
  onOpen: (card: VCardData) => void;
  emptyTitleKey: string;
  emptyDescriptionKey: string;
  Icon?: LucideIcon;
}) {
  const { getBookmarksByType, removeBookmark, isLoading } = useBookmarks();
  if (isLoading) return <DiscoverGridSkeleton />;

  const q = query.trim().toLowerCase();
  const items = getBookmarksByType(type).filter((b) => !q || b.item_name.toLowerCase().includes(q));
  if (items.length === 0) return <DiscoverEmpty Icon={Icon} titleKey={emptyTitleKey} descriptionKey={emptyDescriptionKey} />;

  return (
    <ul className={DISCOVER_GRID} data-discover-saved={type}>
      {items.map((b) => {
        const card = toCard(b);
        return (
          <DataVCard
            key={b.id}
            data={card}
            onOpen={() => onOpen(card)}
            footer={
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void removeBookmark(b.item_type, b.item_id);
                }}
              >
                {t('spotlightDiscover.saved.remove')}
              </Button>
            }
          />
        );
      })}
    </ul>
  );
}
