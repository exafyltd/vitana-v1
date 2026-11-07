/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — the group
 * members modal's data. Native twin of the queries in web
 * `src/components/messages/GroupMembersModal.tsx` (class B):
 *
 *  - members: `global_thread_participants` (active rows of the thread), each
 *    with its `global_community_profiles` name/avatar (L91-149).
 *  - member search (L151-180): ONLY the two directory RPCs the web calls —
 *    `search_global_directory({ search_term })` in the community context,
 *    `search_tenant_directory({ search_term, tenant_id_param })` in a tenant.
 *    They exclude `service_bot_accounts` and `notification_test_actors`
 *    server-side (program NEVER rule 45), so the native search inherits the
 *    exclusion; it never reads a profile table for search. Existing members
 *    are filtered out of the results.
 *  - add / remove / leave / rename (L182-392) with the same system notice
 *    rows in `global_messages`.
 */
import { getSupabase } from '../../../auth/client';
import { deactivateParticipant, noticeName, renameGlobalGroup, type UpdateClient } from '../../../ports/chat';

export interface GroupParticipant {
  id: string;
  user_id: string;
  role: string;
  profile: { display_name?: string | null; avatar_url?: string | null } | null;
}

export interface SearchUser {
  user_id: string;
  display_name: string;
  full_name?: string;
  avatar_url?: string;
}

export type MemberContext = 'global' | 'tenant';

export async function fetchParticipants(threadId: string): Promise<GroupParticipant[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('global_thread_participants')
    .select('id, user_id, role, is_active')
    .eq('thread_id', threadId)
    .eq('is_active', true);
  if (error) throw error;
  const rows = (data as Array<{ id: string; user_id: string; role: string }> | null) ?? [];
  return Promise.all(
    rows.map(async (p) => {
      try {
        const { data: profile, error: pe } = await supabase.from('global_community_profiles').select('display_name, avatar_url').eq('user_id', p.user_id).single();
        return { id: p.id, user_id: p.user_id, role: p.role, profile: pe ? null : (profile as GroupParticipant['profile']) };
      } catch {
        return { id: p.id, user_id: p.user_id, role: p.role, profile: null };
      }
    }),
  );
}

/** The member search — exactly the web's directory RPCs (rule-45 exclusion is server-side). */
export async function searchDirectory(term: string, context: MemberContext, tenantId: string | null | undefined): Promise<SearchUser[]> {
  if (!term.trim()) return [];
  const supabase = getSupabase();
  const { data, error } =
    context === 'global'
      ? await supabase.rpc('search_global_directory' as never, { search_term: term } as never)
      : await supabase.rpc('search_tenant_directory' as never, { search_term: term, tenant_id_param: tenantId } as never);
  if (error) throw error;
  return (data as SearchUser[] | null) ?? [];
}

const updateClient = () => getSupabase() as unknown as UpdateClient;

async function notice(threadId: string, senderId: string | undefined, body: string, contentData: Record<string, unknown>) {
  await getSupabase()
    .from('global_messages')
    .insert({ thread_id: threadId, sender_id: senderId, body, message_type: 'system', content_data: contentData } as never);
}

export async function addMember(threadId: string, me: string | undefined, myName: string, user: SearchUser): Promise<void> {
  const { error } = await getSupabase()
    .from('global_thread_participants')
    .insert({ thread_id: threadId, user_id: user.user_id, role: 'member' } as never);
  if (error) throw error;
  const added = noticeName(user);
  await notice(threadId, me, `${myName || 'Someone'} added ${added || 'someone'}`, {
    system_type: 'member_added',
    added_by: me,
    added_user: user.user_id,
    added_user_name: added,
    actor_name: myName,
  });
}

export async function removeMember(threadId: string, me: string | undefined, myName: string, participant: GroupParticipant, name: string): Promise<void> {
  await deactivateParticipant(updateClient(), 'global_thread_participants', participant.id);
  await notice(threadId, me, `${myName || 'Someone'} removed ${name}`, {
    system_type: 'member_removed',
    removed_by: me,
    removed_user: participant.user_id,
    removed_user_name: name,
    actor_name: myName,
  });
}

export async function leaveGroup(threadId: string, me: string | undefined, mine: GroupParticipant): Promise<void> {
  await deactivateParticipant(updateClient(), 'global_thread_participants', mine.id);
  const name = noticeName(mine.profile) || 'Someone';
  await notice(threadId, me, `${name} left the group`, { system_type: 'member_left', left_user: me, left_user_name: name });
}

export async function renameGroup(threadId: string, me: string | undefined, myName: string, next: string): Promise<void> {
  await renameGlobalGroup(updateClient(), threadId, next);
  try {
    await notice(threadId, me, `${myName || 'Someone'} renamed the group to ${next}`, {
      system_type: 'group_renamed',
      group_name: next,
      renamed_by: me,
      actor_name: myName,
    });
  } catch {
    // The rename is stored; the notice is best effort (web L374-380).
  }
}
