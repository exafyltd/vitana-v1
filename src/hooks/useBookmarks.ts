import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { BookmarkedItem, BookmarkItemType, BookmarkButtonItem } from '@/types/bookmarks';
import { toast } from '@/hooks/use-toast';

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
      toast({
        title: "Error",
        description: "Failed to load bookmarks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addBookmark = async (item: BookmarkButtonItem) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark items",
        variant: "destructive",
      });
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
          toast({
            title: "Already bookmarked",
            description: "This item is already in your bookmarks",
          });
          return false;
        }
        throw error;
      }

      toast({
        title: "Bookmarked!",
        description: `${item.item_name} added to your bookmarks`,
      });

      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark item",
        variant: "destructive",
      });
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

      toast({
        title: "Removed",
        description: "Item removed from bookmarks",
      });

      await fetchBookmarks();
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
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
