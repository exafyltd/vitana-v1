import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { BookmarkedItem, BookmarkItemType, BookmarkButtonItem } from '@/types/bookmarks';
import { notify, notifyError } from '@/lib/i18n-toast';

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookmarks = async () => {
    if (!user) {
      setBookmarks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookmarked_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks((data || []) as BookmarkedItem[]);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedLoadBookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  const addBookmark = async (item: BookmarkButtonItem) => {
    if (!user) {
      notifyError('toasts.hooks.signRequired', 'toasts.hooks.pleaseSignBookmarkItems');
      return false;
    }

    try {
      const { error } = await supabase
        .from('bookmarked_items')
        .insert({
          user_id: user.id,
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
    } catch (error) {
      console.error('Error adding bookmark:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedBookmarkItem');
      return false;
    }
  };

  const removeBookmark = async (item_type: BookmarkItemType, item_id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('bookmarked_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', item_type)
        .eq('item_id', item_id);

      if (error) throw error;

      notify('toasts.hooks.removed', 'toasts.hooks.itemRemovedFromBookmarks');

      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      notifyError('toasts.hooks.error', 'toasts.hooks.failedRemoveBookmark');
      return false;
    }
  };

  const isBookmarked = (item_type: BookmarkItemType, item_id: string): boolean => {
    return bookmarks.some(
      (b) => b.item_type === item_type && b.item_id === item_id
    );
  };

  const getBookmarksByType = (item_type: BookmarkItemType): BookmarkedItem[] => {
    return bookmarks.filter((b) => b.item_type === item_type);
  };

  const toggleBookmark = async (item: BookmarkButtonItem): Promise<boolean> => {
    if (isBookmarked(item.item_type, item.item_id)) {
      return await removeBookmark(item.item_type, item.item_id);
    } else {
      return await addBookmark(item);
    }
  };

  useEffect(() => {
    fetchBookmarks();

    if (!user) return;

    const channel = supabase
      .channel('bookmarks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarked_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    getBookmarksByType,
    toggleBookmark,
    bookmarkCount: bookmarks.length,
  };
}
