/**
 * VTID-05510 (native-wave2-discover-commerce-r2/discover) — native twin of
 * `src/hooks/useBookmarks.ts` (class B: the web Supabase client + realtime).
 * Same `bookmarked_items` reads and writes, same toasts:
 *
 *   select * where user_id = me order by created_at desc     (on mount / after a change)
 *   insert { user_id, item_type, item_id, item_name, item_image_url, item_metadata }
 *     23505 → "already bookmarked"
 *   delete where user_id = me and item_type and item_id
 *   realtime channel `bookmarks-changes` (postgres_changes on the member's rows) → refetch
 *
 * The member id comes from the native auth context instead of the web context.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import { notify, notifyError } from '../../../ports/discover';

export type BookmarkItemType = 'supplement' | 'wellness_service' | 'provider' | 'deal' | 'lab_test' | 'course' | 'event' | 'live_room' | 'music' | 'product';

export interface BookmarkedItem {
  id: string;
  user_id: string;
  item_type: BookmarkItemType;
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BookmarkButtonItem {
  item_type: BookmarkItemType;
  item_id: string;
  item_name: string;
  item_image_url?: string;
  item_metadata?: Record<string, any>;
}

const db = () => getSupabase() as any;

export function useBookmarks() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!userId) {
      setBookmarks([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await db().from('bookmarked_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setBookmarks((data || []) as BookmarkedItem[]);
    } catch {
      notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadBookmarks');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const addBookmark = async (item: BookmarkButtonItem): Promise<boolean> => {
    if (!userId) {
      notifyError('toasts.hooks.signRequired', 'toasts.hooks.pleaseSignBookmarkItems');
      return false;
    }
    try {
      const { error } = await db()
        .from('bookmarked_items')
        .insert({
          user_id: userId,
          item_type: item.item_type,
          item_id: item.item_id,
          item_name: item.item_name,
          item_image_url: item.item_image_url,
          item_metadata: item.item_metadata || {},
        });
      if (error) {
        if (error.code === '23505') {
          notify('toasts.hooks.alreadyBookmarked', 'toasts.hooks.thisItemAlreadyYourBookmarks');
          return false;
        }
        throw error;
      }
      notify('toasts.hooks.bookmarked');
      await fetchBookmarks();
      return true;
    } catch {
      notifyError('toasts.hooks.error', 'toasts.hooks.failedBookmarkItem');
      return false;
    }
  };

  const removeBookmark = async (itemType: BookmarkItemType, itemId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error } = await db().from('bookmarked_items').delete().eq('user_id', userId).eq('item_type', itemType).eq('item_id', itemId);
      if (error) throw error;
      notify('toasts.hooks.removed', 'toasts.hooks.itemRemovedFromBookmarks');
      await fetchBookmarks();
      return true;
    } catch {
      notifyError('toasts.hooks.error', 'toasts.hooks.failedRemoveBookmark');
      return false;
    }
  };

  const isBookmarked = (itemType: BookmarkItemType, itemId: string) => bookmarks.some((b) => b.item_type === itemType && b.item_id === itemId);
  const getBookmarksByType = (itemType: BookmarkItemType) => bookmarks.filter((b) => b.item_type === itemType);
  const toggleBookmark = (item: BookmarkButtonItem) => (isBookmarked(item.item_type, item.item_id) ? removeBookmark(item.item_type, item.item_id) : addBookmark(item));

  useEffect(() => {
    void fetchBookmarks();
    if (!userId) return undefined;
    const client = db();
    if (typeof client?.channel !== 'function') return undefined;
    const channel = client
      .channel('bookmarks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarked_items', filter: `user_id=eq.${userId}` }, () => {
        void fetchBookmarks();
      })
      .subscribe();
    return () => {
      void client.removeChannel?.(channel);
    };
  }, [userId, fetchBookmarks]);

  return { bookmarks, isLoading, addBookmark, removeBookmark, isBookmarked, getBookmarksByType, toggleBookmark, bookmarkCount: bookmarks.length };
}
