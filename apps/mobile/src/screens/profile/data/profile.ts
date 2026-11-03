/**
 * VTID-05429 (Native Wave 2, profile lane) — native twin of the data the web
 * `/me/profile` (`src/pages/EditProfilePage.tsx`) and `/profile/me/privacy`
 * (`src/pages/PrivacySettings.tsx`) screens read and write.
 *
 * The web reaches these through class-B hooks and contexts that import the
 * web Supabase client (`ProfileProvider`, `useProfileStatsCount`,
 * `useProfileMilestones`, `useProfileGallery`, `useUserGroups`,
 * `useProfilePosts`, `useFollow`, `useVitanaIndex`, `useMyRecommendations`),
 * so — per plan decision 2 — they are RE-IMPLEMENTED here against the native
 * client (`getSupabase()` / `getGateway()`), with the same tables, columns,
 * filters and query keys. Nothing is moved into `@vitana/core`.
 *
 * Writes (identity / about / account drawers, per-field visibility tiers) are
 * split in two: a pure `build*Update` that returns the exact request (table,
 * values, match) and `runProfileUpdate` that sends it. The unit tests assert
 * the built request against an in-memory client double and never fire a real
 * write (requirements R5.2). Every write is an UPDATE on the member's own
 * `profiles` row — never an upsert (the web's VTID note: an upsert would try
 * an INSERT and fail the `profiles.vitana_id` NOT NULL constraint).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { getGateway } from '../../../auth/gateway';
import { useAuth } from '../../../auth/AuthProvider';
import { gatewayJson } from '../../../ports/core';
import type { AccountFieldKey, AccountVisibility, FieldVisibility } from '../../../ports/profile';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
/** The loosely typed builder surface these reads use (tables outside the generated Database types). */
const db = () => getSupabase() as unknown as { from: (table: string) => any; rpc: (fn: string, args?: Row) => any };

// ── visibility tiers (web src/types/profile.ts DEFAULT_ACCOUNT_VISIBILITY) ──

/**
 * Native twin of the web `DEFAULT_ACCOUNT_VISIBILITY` (a value, so it cannot
 * cross the type-only core bridge). Must mirror the web constant and the
 * gateway's `FIELD_DEFAULTS` (`services/gateway/src/lib/account-visibility.ts`);
 * tests/profile/data.test.ts pins it against the web file.
 */
export const DEFAULT_ACCOUNT_VISIBILITY: AccountVisibility = {
  firstName: 'private',
  lastName: 'private',
  dateOfBirth: 'private',
  gender: 'private',
  maritalStatus: 'private',
  email: 'private',
  phone: 'private',
  address: 'private',
  country: 'connections',
  city: 'connections',
  memberSince: 'public',
  accountType: 'public',
  verificationStatus: 'public',
  handle: 'public',
  avatarUrl: 'public',
  longevityArchetype: 'public',
  dancePreferences: 'public',
  'dancePreferences.varieties': 'public',
  'dancePreferences.level': 'public',
  'dancePreferences.lookingFor': 'public',
  partnerPreferences: 'private',
  'partnerPreferences.ageRange': 'private',
  'partnerPreferences.gender': 'private',
  'partnerPreferences.relationshipIntent': 'private',
  'partnerPreferences.locationRadius': 'connections',
  serviceOfferings: 'public',
  'serviceOfferings.priceRange': 'public',
  myPosts: 'public',
  'myPosts.commercial': 'public',
  derivedAgeBand: 'connections',
  vitanaHealth: 'private',
  indexBoost: 'public',
};

/** Private → Connections → Public → Private (web `NEXT_TIER` / `NEXT_VISIBILITY`). */
export const NEXT_TIER: Record<FieldVisibility, FieldVisibility> = {
  private: 'connections',
  connections: 'public',
  public: 'private',
};

export function isTier(v: unknown): v is FieldVisibility {
  return v === 'private' || v === 'connections' || v === 'public';
}

/** The tier a key shows: the explicit stored value, else the default, else private (web `tierFor`). */
export function tierFor(visibility: Partial<Record<string, unknown>>, key: AccountFieldKey): FieldVisibility {
  const explicit = visibility[key];
  if (isTier(explicit)) return explicit;
  return DEFAULT_ACCOUNT_VISIBILITY[key] ?? 'private';
}

// ── the member's own profile (web ProfileProvider + EditProfilePage.refetchProfile) ──

export type ProfileLink = { label: string; url: string };

export type SocialPlatform = 'linkedin' | 'instagram' | 'facebook' | 'x' | 'youtube' | 'tiktok';
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = ['linkedin', 'instagram', 'facebook', 'x', 'youtube', 'tiktok'];

export interface MyAccount {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  city?: string;
  memberSince?: string;
  accountType?: string;
  verificationStatus?: string;
  handle?: string;
  avatarUrl?: string;
  longevityArchetype?: string;
  visibility: AccountVisibility;
}

export interface MyProfile {
  userId: string;
  /** `profiles.id` when the row exists (the web share URL uses it), else the auth id. */
  profileId: string;
  displayName: string;
  handle?: string;
  vitanaId?: string;
  avatarUrl?: string;
  avatarOffsetX: number;
  avatarOffsetY: number;
  longevityArchetype?: string;
  bio?: string;
  location?: string;
  links: ProfileLink[];
  languages: string[];
  social: Partial<Record<SocialPlatform, string>>;
  account: MyAccount;
  /** False when the member has no `profiles` row yet (the web renders the email-derived defaults). */
  hasRow: boolean;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.length > 0 ? v : undefined);

/** Web ProfileProvider display name: Account first+last, else display_name, full_name, the email prefix, "User". */
export function displayNameOf(row: Row | null, email: string | undefined): string {
  const composed = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();
  return composed || str(row?.display_name) || str(row?.full_name) || email?.split('@')[0] || 'User';
}

/** Maps a `profiles` row (or null — no row yet) to the screen model, exactly as the web provider does. */
export function mapProfileRow(row: Row | null, userId: string, email?: string): MyProfile {
  const visibility: AccountVisibility = { ...DEFAULT_ACCOUNT_VISIBILITY, ...((row?.account_visibility as Partial<AccountVisibility> | null) ?? {}) };
  const social: Partial<Record<SocialPlatform, string>> = {};
  for (const p of SOCIAL_PLATFORMS) {
    const url = str(row?.[`${p}_url`]);
    if (url) social[p] = url;
  }
  return {
    userId,
    profileId: str(row?.id) ?? userId,
    displayName: displayNameOf(row, email),
    handle: str(row?.handle),
    vitanaId: str(row?.vitana_id),
    avatarUrl: str(row?.avatar_url),
    avatarOffsetX: typeof row?.avatar_offset_x === 'number' ? row.avatar_offset_x : 50,
    avatarOffsetY: typeof row?.avatar_offset_y === 'number' ? row.avatar_offset_y : 50,
    longevityArchetype: str(row?.longevity_archetype),
    bio: str(row?.bio),
    location: str(row?.location),
    links: Array.isArray(row?.links) ? (row.links as ProfileLink[]) : [],
    languages: Array.isArray(row?.languages) ? (row.languages as string[]) : [],
    social,
    account: {
      firstName: str(row?.first_name),
      lastName: str(row?.last_name),
      dateOfBirth: str(row?.date_of_birth),
      gender: str(row?.gender),
      maritalStatus: str(row?.marital_status),
      email: str(row?.email) ?? email,
      phone: str(row?.phone),
      address: str(row?.address),
      country: str(row?.country),
      city: str(row?.city),
      memberSince: str(row?.created_at),
      accountType: str(row?.account_type) ?? 'Community',
      verificationStatus: str(row?.verification_status) ?? 'unverified',
      handle: str(row?.handle),
      avatarUrl: str(row?.avatar_url),
      longevityArchetype: str(row?.longevity_archetype),
      visibility,
    },
    hasRow: !!row,
  };
}

export const myProfileKey = (userId: string | undefined) => ['my-profile', userId] as const;

/** The signed-in member's `profiles` row (web ProfileProvider fetch, `select('*').eq('user_id', id).maybeSingle()`). */
export function useMyProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: myProfileKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<MyProfile> => {
      const { data, error } = await db().from('profiles').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return mapProfileRow((data as Row | null) ?? null, userId as string, user?.email ?? undefined);
    },
  });
}

// ── writes: pure request builders + one sender ────────────────────────────

/** One UPDATE on the member's own `profiles` row. */
export type ProfileUpdate = { table: 'profiles'; values: Row; match: { user_id: string } };

export type IdentityForm = {
  displayName: string;
  handle: string;
  longevityArchetype: string;
  /** The avatar the sheet shows (uploaded or removed there); omitted = the loaded one. */
  avatarUrl?: string;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
};
export type AboutForm = { bio: string; location: string; links: ProfileLink[]; languages: string[] };
export type AccountForm = { firstName: string; lastName: string; phone: string; country: string; city: string };

/**
 * Web `IdentityDrawer.handleSave` payload. The avatar fields are the sheet's
 * (an upload through the media port, or Remove → '' at 50/50), else the
 * loaded profile's.
 */
export function buildIdentityUpdate(userId: string, form: IdentityForm, current: MyProfile, now: Date = new Date()): ProfileUpdate {
  return {
    table: 'profiles',
    values: {
      display_name: form.displayName,
      handle: form.handle,
      avatar_url: form.avatarUrl ?? current.avatarUrl ?? '',
      avatar_offset_x: form.avatarOffsetX ?? current.avatarOffsetX,
      avatar_offset_y: form.avatarOffsetY ?? current.avatarOffsetY,
      longevity_archetype: form.longevityArchetype,
      updated_at: now.toISOString(),
    },
    match: { user_id: userId },
  };
}

/** Web `AboutDrawer.handleSave` payload. */
export function buildAboutUpdate(userId: string, form: AboutForm, now: Date = new Date()): ProfileUpdate {
  return {
    table: 'profiles',
    values: { bio: form.bio, location: form.location, links: form.links, languages: form.languages, updated_at: now.toISOString() },
    match: { user_id: userId },
  };
}

/**
 * Web `ProfileProvider.updateAccount` for the Account drawer fields: each field
 * to its column (empty → null), plus `display_name` composed from first + last
 * name ONLY when that composes to something (an empty name never wipes it).
 */
export function buildAccountUpdate(userId: string, form: AccountForm, now: Date = new Date()): ProfileUpdate {
  const nul = (s: string) => (s.trim() ? s.trim() : null);
  const values: Row = {
    first_name: nul(form.firstName),
    last_name: nul(form.lastName),
    phone: nul(form.phone),
    country: nul(form.country),
    city: nul(form.city),
  };
  const composed = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' ').trim();
  if (composed) values.display_name = composed;
  values.updated_at = now.toISOString();
  return { table: 'profiles', values, match: { user_id: userId } };
}

/** Web `ProfileProvider.setFieldVisibility`: the whole merged map with one key changed. */
export function buildVisibilityUpdate(
  userId: string,
  current: AccountVisibility,
  key: AccountFieldKey,
  next: FieldVisibility,
  now: Date = new Date(),
): ProfileUpdate {
  return {
    table: 'profiles',
    values: { account_visibility: { ...current, [key]: next }, updated_at: now.toISOString() },
    match: { user_id: userId },
  };
}

/** Sends one built update (`update(values).eq('user_id', …)`). */
export async function runProfileUpdate(req: ProfileUpdate): Promise<void> {
  const { error } = await db().from(req.table).update(req.values).eq('user_id', req.match.user_id);
  if (error) throw error;
}

/** Sends a built update and refreshes the profile (web `refreshProfile()` after every drawer save). */
export function useProfileUpdate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runProfileUpdate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myProfileKey(user?.id) });
    },
  });
}

// ── reads behind the profile tabs / cards ────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Web `useProfileStatsCount`: posts, gallery media and max(memberships, approved created groups). */
export function useProfileStatsCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-stats-count', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const head = { count: 'exact', head: true };
      const [posts, gallery, memberships, created] = await Promise.all([
        db().from('profile_posts').select('id', head).eq('user_id', userId),
        db().from('profile_gallery').select('id', head).eq('user_id', userId),
        db().from('global_community_group_members').select('id', head).eq('user_id', userId),
        db().from('global_community_groups').select('id', head).eq('created_by', userId).eq('status', 'approved'),
      ]);
      return {
        postsCount: posts.count ?? 0,
        mediaCount: gallery.count ?? 0,
        groupsCount: Math.max(memberships.count ?? 0, created.count ?? 0),
      };
    },
  });
}

/** Web `useFollow` counts (`get_user_follow_counts`, falling back to `user_follows` head counts). */
export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    enabled: !!userId && UUID_RE.test(userId),
    queryFn: async () => {
      try {
        const { data, error } = await db().rpc('get_user_follow_counts', { user_id_param: userId });
        if (error) throw error;
        if (data && typeof data === 'object') {
          return { followers: Number((data as Row).followers_count) || 0, following: Number((data as Row).following_count) || 0 };
        }
      } catch {
        // fall through to the direct counts, as the web hook does
      }
      const head = { count: 'exact', head: true };
      const [followers, following] = await Promise.all([
        db().from('user_follows').select('*', head).eq('following_id', userId),
        db().from('user_follows').select('*', head).eq('follower_id', userId),
      ]);
      return { followers: followers.count ?? 0, following: following.count ?? 0 };
    },
  });
}

/** Latest Vitana Index total (web `useVitanaIndex` reads `vitana_index_scores`; read only — no recompute RPC natively). */
export function useLatestVitanaIndex(userId: string | undefined) {
  return useQuery({
    queryKey: ['vitana-index-latest', userId],
    enabled: !!userId,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await db()
        .from('vitana_index_scores')
        .select('date, score_total')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = Array.isArray(data) ? (data[0] as Row | undefined) : undefined;
      return typeof row?.score_total === 'number' ? row.score_total : null;
    },
  });
}

export interface ProfilePost {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

/** Web `useProfilePosts` read (query key shared with the home composer's invalidation). */
export function useProfilePosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-posts', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfilePost[]> => {
      const { data, error } = await db().from('profile_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfilePost[];
    },
  });
}

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  milestone_date?: string | null;
  icon: string;
  is_public: boolean;
}

/** Web `useProfileMilestones` read. */
export function useProfileMilestones(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-milestones', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await db()
        .from('profile_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('milestone_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Milestone[];
    },
  });
}

export interface GalleryPhoto {
  id: string;
  image_url: string;
  caption?: string | null;
}

/** Web `useProfileGallery` read. */
export function useProfileGallery(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-gallery', userId],
    enabled: !!userId,
    queryFn: async (): Promise<GalleryPhoto[]> => {
      const { data, error } = await db().from('profile_gallery').select('*').eq('user_id', userId).order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as GalleryPhoto[];
    },
  });
}

export interface UserGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  member_count: number;
}

/** Web `useUserGroups`: groups the member joined plus approved groups they created, de-duplicated. */
export function useUserGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-groups', userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserGroup[]> => {
      const cols = 'id, name, description, category, cover_url, avatar_url, member_count';
      const [memberships, created] = await Promise.all([
        db().from('global_community_group_members').select('group_id, role, joined_at').eq('user_id', userId).order('joined_at', { ascending: false }),
        db().from('global_community_groups').select(`${cols}, created_at`).eq('created_by', userId).eq('status', 'approved').order('created_at', { ascending: false }),
      ]);
      const ids: string[] = ((memberships.data as Row[] | null) ?? []).map((m) => m.group_id);
      let joined: UserGroup[] = [];
      if (ids.length > 0) {
        const { data } = await db().from('global_community_groups').select(cols).in('id', ids);
        joined = (data as UserGroup[] | null) ?? [];
      }
      const out = new Map<string, UserGroup>();
      for (const g of [...joined, ...(((created.data as UserGroup[] | null) ?? []))]) if (!out.has(g.id)) out.set(g.id, g);
      return [...out.values()];
    },
  });
}

export interface Recommendation {
  id: string;
  product_id: string;
  product_title: string | null;
  click_count: number;
  conversion_count: number;
}

/** Web `useMyRecommendations` — the Business segment (`GET /api/v1/discover/my-recommendations`). */
export function useMyRecommendations(enabled: boolean) {
  return useQuery({
    queryKey: ['my-recommendations'],
    enabled,
    queryFn: async (): Promise<Recommendation[]> => {
      const data = await gatewayJson<{ items?: Recommendation[] }>(getGateway(), '/discover/my-recommendations');
      return Array.isArray(data?.items) ? data.items : [];
    },
  });
}
