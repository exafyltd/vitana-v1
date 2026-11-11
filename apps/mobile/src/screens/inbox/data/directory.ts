/**
 * VTID-05459 (native-wave2-inbox-chat-calls-r2/inbox-list) — the member
 * search and the conversation / group creation of the new-conversation sheet,
 * re-implemented natively from `src/components/NewConversationPopup.tsx` and
 * `src/lib/messaging/createGlobalGroupThread.ts` (both use the web Supabase
 * client, class B).
 *
 * MEMBER-LISTING EXCLUSION (program NEVER rule 45, requirements R5.5,
 * sparring R1-F1): the member search calls EXACTLY the two RPCs the web calls
 * — `search_global_directory({ search_term })` in the Community context and
 * `search_tenant_directory({ search_term, tenant_id_param })` in the Network
 * context (NewConversationPopup.tsx:125,142; CreateGroupPopup.tsx:51). The
 * `service_bot_accounts` + `notification_test_actors` exclusion is applied by
 * those RPCs server-side, so it is inherited; this file adds NO member-listing
 * table query of its own.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';

export interface DirectoryUser {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export class NoTenantContextError extends Error {
  constructor() {
    super('no_tenant_context');
  }
}

/** The member search: the web RPCs, same parameters, results as returned. */
export async function searchDirectory(sb: SupabaseClient, query: string, context: 'global' | 'tenant', tenantId: string | null): Promise<DirectoryUser[]> {
  const term = query.trim();
  if (context === 'global') {
    const { data, error } = await sb.rpc('search_global_directory', { search_term: term });
    if (error) throw error;
    return (data as DirectoryUser[] | null) || [];
  }
  if (!tenantId) throw new NoTenantContextError();
  const { data, error } = await sb.rpc('search_tenant_directory', { search_term: term, tenant_id_param: tenantId });
  if (error) throw error;
  return (data as DirectoryUser[] | null) || [];
}

/** A global DM (is_community_user, then create_or_get_global_dm) → its thread id. */
export async function createGlobalDm(sb: SupabaseClient, recipientId: string): Promise<string> {
  const { data: isCommunity, error: communityError } = await sb.rpc('is_community_user');
  if (communityError) throw new Error(`Community user verification failed: ${communityError.message}`);
  if (!isCommunity) throw new Error('Only community users can create global conversations');
  const { data, error } = await sb.rpc('create_or_get_global_dm', { p_other_user: recipientId });
  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  const threadId = Array.isArray(data) ? (data[0] as { thread_id?: string } | undefined)?.thread_id : undefined;
  if (!threadId) throw new Error('Failed to create or get thread - no thread ID returned');
  return threadId;
}

/** A tenant DM (create_tenant_direct_thread) → its thread id. */
export async function createTenantDm(sb: SupabaseClient, recipientId: string, tenantId: string | null): Promise<string> {
  if (!tenantId) throw new Error('No active tenant found');
  const { data, error } = await sb.rpc('create_tenant_direct_thread', { p_recipient_id: recipientId, p_tenant_id: tenantId });
  if (error) throw error;
  return data as string;
}

/** `noticeName` (src/lib/messaging/groupSystemNotice.ts): a display name, never an email. */
function noticeName(profile?: { display_name?: string | null } | null): string {
  const name = (profile?.display_name || '').trim();
  return name.includes('@') ? '' : name;
}

/**
 * `createGlobalGroupThread` + `fetchMyNoticeName`: the thread (no select after
 * insert), the creator as admin first, then the members, then the best-effort
 * "created the group" system notice. Returns the thread id.
 */
export async function createGlobalGroup(sb: SupabaseClient, userId: string, name: string, memberIds: string[]): Promise<string> {
  let actorName = '';
  try {
    const { data } = await sb.from('global_community_profiles').select('display_name').eq('user_id', userId).maybeSingle();
    actorName = noticeName(data as { display_name?: string | null } | null);
  } catch {
    actorName = '';
  }
  const threadId = randomUUID();
  const { error: threadError } = await sb.from('global_message_threads').insert({ id: threadId, created_by: userId, type: 'group', name });
  if (threadError) throw threadError;
  const { error: adminError } = await sb.from('global_thread_participants').insert({ thread_id: threadId, user_id: userId, role: 'admin' });
  if (adminError) throw adminError;
  const members = [...new Set(memberIds)].filter((id) => id !== userId);
  if (members.length > 0) {
    const { error: membersError } = await sb.from('global_thread_participants').insert(members.map((id) => ({ thread_id: threadId, user_id: id, role: 'member' })));
    if (membersError) throw membersError;
  }
  try {
    await sb.from('global_messages').insert({
      thread_id: threadId,
      sender_id: userId,
      body: `${actorName || 'Someone'} created the group`,
      message_type: 'system',
      content_data: { system_type: 'group_created', group_name: name, created_by: userId, actor_name: actorName },
    });
  } catch {
    // best effort, as on web: the group exists
  }
  return threadId;
}
