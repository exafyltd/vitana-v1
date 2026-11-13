/**
 * VTID-05677 — bookmarks, the native twin of web `useBookmarks.ts`: the member's
 * `bookmarked_items` rows (newest first), a realtime channel on
 * `bookmarked_items` filtered to the member that refetches, insert on add
 * (unique violation `23505` = already bookmarked), delete on remove.
 */
import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';
import type { MusicBookmarkInput } from '../../../ports/media';

type BookmarkRow = { item_type: string; item_id: string };

export function useBookmarksQuery(): { isBookmarked: (type: 'music', id: string) => boolean } {
  const { user } = useAuth();
  const userId = user?.id;
  const [rows, setRows] = useState<BookmarkRow[]>([]);

  const fetchBookmarks = useCallback(async () => {
    if (!userId) {
      setRows([]);
      return;
    }
    try {
      const { data, error } = await getSupabase().from('bookmarked_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as BookmarkRow[]);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  }, [userId]);

  useEffect(() => {
    void fetchBookmarks();
    if (!userId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel('bookmarks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarked_items', filter: `user_id=eq.${userId}` }, () => {
        void fetchBookmarks();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, fetchBookmarks]);

  return { isBookmarked: (type, id) => rows.some((b) => b.item_type === type && b.item_id === id) };
}

/** Add when absent, remove when present (web `toggleBookmark`). Resolves true on success. */
export async function toggleMusicBookmark(item: MusicBookmarkInput): Promise<boolean> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const existing = await supabase.from('bookmarked_items').select('id').eq('user_id', user.id).eq('item_type', item.item_type).eq('item_id', item.item_id);
  const present = Array.isArray(existing.data) && existing.data.length > 0;
  if (present) {
    const { error } = await supabase.from('bookmarked_items').delete().eq('user_id', user.id).eq('item_type', item.item_type).eq('item_id', item.item_id);
    if (error) throw error;
    return true;
  }
  const { error } = await supabase.from('bookmarked_items').insert({
    user_id: user.id,
    item_type: item.item_type,
    item_id: item.item_id,
    item_name: item.item_name,
    item_image_url: item.item_image_url,
    item_metadata: item.item_metadata ?? {},
  });
  if (error) {
    if ((error as { code?: string }).code === '23505') return false;
    throw error;
  }
  return true;
}
