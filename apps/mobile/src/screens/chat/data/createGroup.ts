/**
 * VTID-05458 (native-wave2-inbox-chat-calls-r2/conversation-chat) — creating a
 * group from the DM header (ConversationView.tsx:1283 → CreateGroupPopup),
 * native twin of web `src/lib/messaging/createGlobalGroupThread.ts` and the
 * popup's duplicate check (CreateGroupPopup.tsx checkForDuplicateGroup):
 *
 *  - a group with exactly these members created in the last minute is a
 *    duplicate ("This group already exists");
 *  - `global_message_threads` row (type group) → me as admin → the members →
 *    the best-effort "created the group" system notice (rendered from i18n);
 *  - the community context only: a tenant group is refused like on the web
 *    (TENANT_GROUP_CREATE_UNSUPPORTED).
 * The id is `expo-crypto`'s randomUUID (the web uses the `uuid` package).
 */
import { randomUUID } from 'expo-crypto';
import { getSupabase } from '../../../auth/client';
import { noticeName } from '../../../ports/chat';

export const TENANT_GROUP_CREATE_UNSUPPORTED = 'tenant_group_create_unsupported';

type Db = ReturnType<typeof getSupabase>;

export async function isDuplicateGroup(memberIds: string[], userId: string, client: Db = getSupabase()): Promise<boolean> {
  try {
    const all = [...memberIds, userId].filter(Boolean).sort();
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const { data, error } = await client
      .from('global_message_threads')
      .select('id, global_thread_participants!inner(user_id)')
      .eq('type', 'group')
      .gte('created_at', cutoff);
    if (error) throw error;
    for (const thread of (data ?? []) as Array<{ global_thread_participants: Array<{ user_id: string }> }>) {
      const ids = thread.global_thread_participants.map((p) => p.user_id).sort();
      if (JSON.stringify(ids) === JSON.stringify(all)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchMyNoticeName(userId: string, client: Db = getSupabase()): Promise<string> {
  try {
    const { data } = await client.from('global_community_profiles').select('display_name').eq('user_id', userId).maybeSingle();
    return noticeName(data as { display_name?: string | null } | null);
  } catch {
    return '';
  }
}

export async function createGlobalGroupThread(
  input: { userId: string; userName?: string | null; name: string; memberIds: string[] },
  client: Db = getSupabase(),
): Promise<string> {
  const { userId, userName, name, memberIds } = input;
  const threadId = randomUUID();
  const { error: threadError } = await client.from('global_message_threads').insert({ id: threadId, created_by: userId, type: 'group', name } as never);
  if (threadError) throw threadError;
  const { error: adminError } = await client.from('global_thread_participants').insert({ thread_id: threadId, user_id: userId, role: 'admin' } as never);
  if (adminError) throw adminError;
  const members = [...new Set(memberIds)].filter((id) => id !== userId);
  if (members.length > 0) {
    const { error } = await client.from('global_thread_participants').insert(members.map((id) => ({ thread_id: threadId, user_id: id, role: 'member' })) as never);
    if (error) throw error;
  }
  const actorName = noticeName({ display_name: userName });
  try {
    await client.from('global_messages').insert({
      thread_id: threadId,
      sender_id: userId,
      body: `${actorName || 'Someone'} created the group`,
      message_type: 'system',
      content_data: { system_type: 'group_created', group_name: name, created_by: userId, actor_name: actorName },
    } as never);
  } catch {
    // Best effort: the group exists without its notice.
  }
  return threadId;
}
