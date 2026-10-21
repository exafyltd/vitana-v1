/**
 * VTID-05296 (N-W2 community-hub) — native twin of the web group data hooks
 * (`src/hooks/useUserGroups.ts`, `useGroupDirectory.ts`, the inline queries in
 * `GroupDetail.tsx` and `useGroupMembership.ts`). Same PostgREST queries, same
 * columns, same transforms, RE-IMPLEMENTED against the injected native
 * Supabase client (`getSupabase()`) — not imported from `@vitana/core`.
 *
 * These are group / group-membership reads and writes, not a member-listing
 * directory: they surface groups and a group's own roster, never a browsable
 * list of community member profiles. Rule 45 (`service_bot_accounts` ∪
 * `notification_test_actors`) governs real-member-facing profile surfaces,
 * which live in `directory.ts` (members/search/find-partner); this file adds
 * no such surface.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../../../auth/client';
import { useAuth } from '../../../auth/AuthProvider';

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  member_count: number;
  role: string;
  joined_at: string;
}

export interface DirectoryGroup {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

export interface GroupDetailRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  cover_url: string | null;
  avatar_url: string | null;
  member_count: number;
  is_public: boolean;
  created_by: string | null;
}

export interface GroupMemberPreview {
  user_id: string;
  role: string;
  joined_at: string;
}

/** Mirrors `useUserGroups` — memberships + created groups, merged and sorted by join date. */
export function useUserGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-groups', userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<UserGroup[]> => {
      if (!userId) return [];
      const supabase = getSupabase();

      const [membershipsResult, createdGroupsResult] = await Promise.all([
        supabase
          .from('global_community_group_members')
          .select('group_id, role, joined_at')
          .eq('user_id', userId)
          .order('joined_at', { ascending: false }),
        supabase
          .from('global_community_groups')
          .select('id, name, description, category, cover_url, avatar_url, member_count, created_at')
          .eq('created_by', userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
      ]);

      const membershipRows = (membershipsResult.data as { group_id: string; role: string; joined_at: string }[] | null) ?? [];
      const creatorRows =
        (createdGroupsResult.data as {
          id: string;
          name: string;
          description: string | null;
          category: string | null;
          cover_url: string | null;
          avatar_url: string | null;
          member_count: number | null;
          created_at: string;
        }[] | null) ?? [];

      let membershipGroups: UserGroup[] = [];
      if (membershipRows.length > 0) {
        const groupIds = membershipRows.map((row) => row.group_id);
        const { data: groups, error: groupsError } = await supabase
          .from('global_community_groups')
          .select('id, name, description, category, cover_url, avatar_url, member_count')
          .in('id', groupIds);
        if (!groupsError) {
          const groupMap = new Map(
            ((groups as GroupDetailRow[] | null) ?? []).map((group) => [group.id, group]),
          );
          membershipGroups = membershipRows
            .map((row) => {
              const group = groupMap.get(row.group_id);
              if (!group) return null;
              return {
                id: group.id,
                name: group.name,
                description: group.description,
                category: group.category,
                cover_url: group.cover_url,
                avatar_url: group.avatar_url,
                member_count: group.member_count || 0,
                role: row.role,
                joined_at: row.joined_at,
              } satisfies UserGroup;
            })
            .filter((group): group is UserGroup => group !== null);
        }
      }

      const creatorGroups: UserGroup[] = creatorRows.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        category: group.category,
        cover_url: group.cover_url,
        avatar_url: group.avatar_url,
        member_count: group.member_count || 0,
        role: 'admin',
        joined_at: group.created_at,
      }));

      const mergedById = new Map<string, UserGroup>();
      membershipGroups.forEach((group) => mergedById.set(group.id, group));
      creatorGroups.forEach((group) => {
        if (!mergedById.has(group.id)) mergedById.set(group.id, group);
      });

      return Array.from(mergedById.values()).sort(
        (a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime(),
      );
    },
  });
}

/** Mirrors `useGroupDirectory` — approved + public groups, optional name search. */
export function useGroupDirectory(search?: string) {
  return useQuery({
    queryKey: ['group-directory', search ?? ''],
    staleTime: 30_000,
    queryFn: async (): Promise<DirectoryGroup[]> => {
      const supabase = getSupabase();
      let query = supabase
        .from('global_community_groups')
        .select('id, name, description, category, cover_url, avatar_url, member_count, is_public, created_at')
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('member_count', { ascending: false });
      if (search && search.trim()) query = query.ilike('name', `%${search.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return ((data as DirectoryGroup[] | null) ?? []);
    },
  });
}

/** Mirrors the `GroupDetail.tsx` inline query for a single group. */
export function useGroupDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['group-detail', id],
    enabled: !!id,
    queryFn: async (): Promise<GroupDetailRow | null> => {
      if (!id) return null;
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('global_community_groups')
        .select('id, name, description, category, cover_url, avatar_url, member_count, is_public, created_by')
        .eq('id', id)
        .single();
      if (error) throw error;
      return (data as GroupDetailRow) ?? null;
    },
  });
}

/** Mirrors the `GroupDetail.tsx` members-preview query (first 12 by join date). */
export function useGroupMembersPreview(id: string | undefined) {
  return useQuery({
    queryKey: ['group-members-preview', id],
    enabled: !!id,
    queryFn: async (): Promise<GroupMemberPreview[]> => {
      if (!id) return [];
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('global_community_group_members')
        .select('user_id, role, joined_at')
        .eq('group_id', id)
        .order('joined_at', { ascending: true })
        .limit(12);
      if (error) return [];
      return ((data as GroupMemberPreview[] | null) ?? []);
    },
  });
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  category?: string;
  is_public: boolean;
}

/**
 * Mirrors the web `CreateGroupPopup` insert (`src/components/CreateGroupPopup.tsx`):
 * insert the group as `approved`, ensure the creator is an `admin` member, then
 * invalidate the directory + my-groups caches. Direct Supabase insert against
 * the injected native client.
 */
export function useCreateGroup(onCreated?: (groupId: string) => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGroupInput): Promise<{ id: string }> => {
      const userId = user?.id;
      if (!userId) throw new Error('not signed in');
      const supabase = getSupabase();
      const { data: created, error: groupError } = await supabase
        .from('global_community_groups')
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category || null,
          is_public: input.is_public,
          created_by: userId,
          status: 'approved',
          member_count: 0,
        })
        .select('id')
        .single();
      if (groupError) throw groupError;
      const groupId = (created as { id: string }).id;

      const { count, error: checkError } = await supabase
        .from('global_community_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (checkError) throw checkError;
      if ((count ?? 0) === 0) {
        const { error: memberError } = await supabase
          .from('global_community_group_members')
          .insert({ group_id: groupId, user_id: userId, role: 'admin' });
        if (memberError) throw memberError;
      }
      return { id: groupId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-directory'] });
      onCreated?.(result.id);
    },
  });
}

/** Mirrors `useGroupMembership` — membership check + join/leave (direct insert/delete). */
export function useGroupMembership(groupId?: string) {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const membershipQuery = useQuery({
    queryKey: ['group-membership', groupId, userId],
    enabled: !!groupId && !!userId && !authLoading,
    staleTime: 30_000,
    queryFn: async (): Promise<boolean> => {
      if (!groupId || !userId) return false;
      const supabase = getSupabase();
      const { data: groupMeta } = await supabase
        .from('global_community_groups')
        .select('created_by')
        .eq('id', groupId)
        .maybeSingle();
      if ((groupMeta as { created_by?: string } | null)?.created_by === userId) return true;
      const { count, error } = await supabase
        .from('global_community_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) return false;
      return (count ?? 0) > 0;
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['group-membership', groupId] });
    queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    queryClient.invalidateQueries({ queryKey: ['group-directory'] });
    queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) throw new Error('Missing groupId or userId');
      const supabase = getSupabase();
      const { error } = await supabase
        .from('global_community_group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) throw new Error('Missing groupId or userId');
      const supabase = getSupabase();
      const { error } = await supabase
        .from('global_community_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return {
    isMember: membershipQuery.data ?? false,
    checkingMembership: authLoading || membershipQuery.isLoading,
    joinGroup: () => joinMutation.mutate(),
    leaveGroup: () => leaveMutation.mutate(),
    isJoining: joinMutation.isPending,
    isLeaving: leaveMutation.isPending,
  };
}
