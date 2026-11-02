/**
 * VTID-05430 (Native Wave 2, public-profile lane) — native twin of the data
 * flow inside the web `src/pages/PublicProfilePage.tsx` (`fetchProfile`) and of
 * the read half of `src/hooks/useProfilePosts.ts`. Same RPCs, same tables, same
 * columns, same transforms, RE-IMPLEMENTED against the injected native Supabase
 * client (`getSupabase()`) — not imported from `@vitana/core` (the web page and
 * hooks are class B: they import `@/integrations/supabase/client`).
 *
 * Reads only. The page's lookup order is kept:
 *  1. `get_user_profile_by_identifier` with the identifier minus a leading `@`;
 *  2. no row → the `handle_aliases` fallback (VTID-01967): a legacy handle that
 *     maps to a user whose canonical `vitana_id` / `handle` differs redirects to
 *     `/u/<canonical>`;
 *  3. found → `get_public_vitana_index` (no Index, or an error, renders the card
 *     without the badge), then the public milestones and gallery as secondary
 *     data whose failure never drops the profile.
 * Every request is bounded by the web's 10 s timeout, so a stalled socket ends
 * in the error state instead of an endless spinner.
 *
 * The query is keyed on the identifier only (the web effect deliberately does
 * not depend on `user`), so a token refresh never re-runs it.
 */
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import type { GalleryPhoto, Milestone, ProfilePost, PublicProfile, PublicProfileResult } from '../types';

const REQUEST_TIMEOUT_MS = 10_000;

/** The `get_user_profile_by_identifier` row columns the page reads. */
export interface DatabaseProfile {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  bio?: string | null;
  location?: string | null;
  created_at?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  facebook_url?: string | null;
  x_url?: string | null;
  longevity_archetype?: string | null;
  account_type?: string | null;
  verification_status?: string | null;
}

type QueryResult = { data: unknown; error: unknown };

/** Rejects after `ms` (the web's `AbortSignal.timeout(10000)`). */
export function withTimeout<T>(work: PromiseLike<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(work).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Web `cleanId`: the identifier without a leading `@`. */
export function cleanIdentifier(identifier: string): string {
  return identifier.startsWith('@') ? identifier.slice(1) : identifier;
}

/** Web `transformedProfile` (the fields the native screens render). */
export function toPublicProfile(db: DatabaseProfile, vitanaScore: number | null): PublicProfile {
  return {
    id: db.user_id,
    name: db.display_name || db.full_name || 'Unknown User',
    handle: db.handle || '',
    avatarUrl: db.avatar_url || '',
    coverUrl: db.cover_url || '',
    bio: db.bio || '',
    location: db.location || '',
    vitanaIndex: vitanaScore ?? undefined,
    longevityArchetype: db.longevity_archetype || undefined,
    linkedin_url: db.linkedin_url || undefined,
    instagram_url: db.instagram_url || undefined,
    tiktok_url: db.tiktok_url || undefined,
    youtube_url: db.youtube_url || undefined,
    facebook_url: db.facebook_url || undefined,
    x_url: db.x_url || undefined,
    memberSince: db.created_at || undefined,
    accountType: db.account_type || undefined,
    verificationStatus: db.verification_status || undefined,
    stats: { posts: 0, followers: 0, following: 0, mediaUploads: 0, groupsJoined: 0 },
  };
}

/** The VTID-01967 alias lookup: the canonical identifier, or null. Never throws. */
async function aliasCanonical(cleanId: string): Promise<string | null> {
  const supabase = getSupabase();
  try {
    const { data: aliasRow } = (await withTimeout(
      supabase.from('handle_aliases').select('user_id').eq('old_handle', cleanId.toLowerCase()).maybeSingle(),
    )) as QueryResult;
    const userId = (aliasRow as { user_id?: string } | null)?.user_id;
    if (!userId) return null;
    const { data: canonicalProfile } = (await withTimeout(
      supabase.from('profiles').select('handle, vitana_id').eq('user_id', userId).maybeSingle(),
    )) as QueryResult;
    const row = canonicalProfile as { vitana_id?: string | null; handle?: string | null } | null;
    const canonical = row?.vitana_id || row?.handle;
    return canonical && canonical !== cleanId ? canonical : null;
  } catch {
    return null;
  }
}

/** Live Vitana Index (public SECURITY DEFINER RPC); null when none or on error. */
async function publicVitanaIndex(userId: string): Promise<number | null> {
  try {
    const { data, error } = (await withTimeout(getSupabase().rpc('get_public_vitana_index', { p_user_id: userId }))) as QueryResult;
    if (error) return null;
    const row = (Array.isArray(data) ? data[0] : data) as { score_total?: unknown } | null;
    const raw = row?.score_total;
    return typeof raw === 'number' && raw > 0 ? raw : null;
  } catch {
    return null;
  }
}

/** Public milestones + gallery. A failure leaves both empty (never drops the profile). */
async function secondaryData(userId: string): Promise<{ milestones: Milestone[]; galleryPhotos: GalleryPhoto[] }> {
  const supabase = getSupabase();
  try {
    const [milestonesRes, galleryRes] = (await Promise.all([
      withTimeout(
        supabase.from('profile_milestones').select('*').eq('user_id', userId).eq('is_public', true).order('milestone_date', { ascending: false }),
      ),
      withTimeout(supabase.from('profile_gallery').select('*').eq('user_id', userId).eq('is_public', true).order('sort_order', { ascending: true })),
    ])) as [QueryResult, QueryResult];
    return {
      milestones: ((milestonesRes.data as Milestone[] | null) ?? []) as Milestone[],
      galleryPhotos: ((galleryRes.data as GalleryPhoto[] | null) ?? []) as GalleryPhoto[],
    };
  } catch {
    return { milestones: [], galleryPhotos: [] };
  }
}

/** One lookup of `/u/:identifier` (web `fetchProfile`). */
export async function fetchPublicProfile(identifier: string): Promise<PublicProfileResult> {
  const cleanId = cleanIdentifier(identifier);
  try {
    const { data, error: dbError } = (await withTimeout(
      getSupabase().rpc('get_user_profile_by_identifier', { identifier: cleanId }),
    )) as QueryResult;
    const rows = (data as DatabaseProfile[] | null) ?? [];

    if (!dbError && rows.length === 0 && cleanId) {
      const canonical = await aliasCanonical(cleanId);
      if (canonical) return { status: 'redirect', canonical };
    }
    if (dbError) return { status: 'error', reason: 'load-failed' };
    if (rows.length === 0) return { status: 'not-found' };

    const db = rows[0];
    const profile = toPublicProfile(db, await publicVitanaIndex(db.user_id));
    const { milestones, galleryPhotos } = await secondaryData(db.user_id);
    return { status: 'found', profile, milestones, galleryPhotos };
  } catch {
    return { status: 'error', reason: 'unexpected' };
  }
}

export const publicProfileKey = (identifier: string) => ['public-profile', identifier] as const;

/** The page's profile state, keyed on the identifier only. */
export function usePublicProfile(identifier: string | undefined) {
  return useQuery<PublicProfileResult>({
    queryKey: publicProfileKey(identifier ?? ''),
    enabled: !!identifier,
    retry: false,
    queryFn: () => fetchPublicProfile(identifier as string),
  });
}

/** Read half of web `useProfilePosts`: the member's posts, newest first. */
export function useProfilePosts(userId: string | undefined) {
  return useQuery<ProfilePost[]>({
    queryKey: ['profile-posts', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = (await withTimeout(
        getSupabase().from('profile_posts').select('*').eq('user_id', userId as string).order('created_at', { ascending: false }),
      )) as QueryResult;
      if (error) throw new Error('profile-posts');
      return ((data as ProfilePost[] | null) ?? []) as ProfilePost[];
    },
  });
}
