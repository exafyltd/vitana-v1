/**
 * VTID-05426 (native-wave2-memory-diary-r2/diary) — diary entries, the native
 * re-implementation of the class-B web data paths:
 *
 *  - read: `DiaryEntryList.tsx` — `diary_entries` of the member, newest first,
 *    100 rows, query key `['diary-entries', 'all']`, refetched on every
 *    `postgres_changes` event of a realtime channel (web
 *    `realtimeChannel('diary-entries-changes-all')`). The client is the app's
 *    one Supabase client (`auth/client.ts`, built by `@vitana/core/supabase`
 *    through the core port); no direct supabase-js import.
 *  - write: `memory-api.saveDiaryEntry` — `POST /memory/diary/entries`, the one
 *    diary write path (diary row + memory episode + Vitana Index sync,
 *    VTID-04390), through the community gateway.
 *  - delete: `memory-api.deleteDiaryEntry` — `DELETE /memory/diary/entries/:id`,
 *    after removing the entry's `diary-photos` objects (web handleDelete).
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { diaryJson } from './client';

export type DiarySource = 'text' | 'voice' | 'photo' | 'manual';

export type DiaryEntry = {
  id: string;
  user_id?: string;
  text: string;
  source?: string | null;
  tags?: string[] | null;
  attachments?: unknown;
  duration?: number | null;
  created_at: string;
  updated_at?: string;
};

export type PillarDelta = { total: number; nutrition: number; hydration: number; exercise: number; sleep: number; mental: number };

/** The Vitana Index sync the diary endpoint runs (web `DiaryIndexResult`). */
export type DiaryIndexResult = {
  entry_date: string;
  health_features_written: number;
  pillars_after: PillarDelta | null;
  index_delta: PillarDelta | null;
};

export type SavedDiaryEntry = {
  entry: { id: string; created_at: string };
  memory_item_id: string | null;
  index: DiaryIndexResult | null;
};

export const DIARY_ENTRIES_KEY = ['diary-entries'] as const;
export const VITANA_INDEX_KEY = ['vitana_index'] as const;
const ALL_KEY = ['diary-entries', 'all'] as const;

/** The signed-in member's id (web `supabase.auth.getUser()`); throws when signed out. */
export async function currentUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}

export async function fetchDiaryEntries(): Promise<DiaryEntry[]> {
  const userId = await currentUserId();
  const { data, error } = await getSupabase().from('diary_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as DiaryEntry[];
}

/** The entry list plus the realtime refetch. */
export function useDiaryEntries() {
  const query = useQuery({ queryKey: ALL_KEY, queryFn: fetchDiaryEntries });
  const { refetch } = query;
  useEffect(() => {
    const client = getSupabase();
    const channel = client
      .channel('diary-entries-changes-all')
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'diary_entries' } as never, () => {
        void refetch();
      })
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refetch]);
  return query;
}

export function saveDiaryEntry(input: { text: string; source: DiarySource; tags?: string[]; duration?: number | null; attachments?: string[] | null; entry_date?: string }): Promise<SavedDiaryEntry> {
  return diaryJson<SavedDiaryEntry>('/memory/diary/entries', { method: 'POST', body: JSON.stringify(input) });
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  await diaryJson(`/memory/diary/entries/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** The entry's photo urls (`attachments` is a JSON column). */
export function photoUrls(entry: Pick<DiaryEntry, 'attachments'>): string[] {
  return Array.isArray(entry.attachments) ? (entry.attachments as unknown[]).filter((u): u is string => typeof u === 'string') : [];
}

/** Invalidations after a write (web: `['diary-entries']` and the header Index badge `['vitana_index']`). */
export function useInvalidateDiary() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: DIARY_ENTRIES_KEY });
    void qc.invalidateQueries({ queryKey: VITANA_INDEX_KEY });
  };
}

/** Puts a just-saved entry at the top of the cached list (web PhotoDiaryUploader `prependIfMissing`). */
export function usePrependEntry() {
  const qc = useQueryClient();
  return (entry: DiaryEntry) =>
    qc.setQueryData<DiaryEntry[]>(ALL_KEY, (old) => {
      const list = Array.isArray(old) ? old : [];
      if (list.some((e) => e.id === entry.id)) return list;
      return [entry, ...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
}
