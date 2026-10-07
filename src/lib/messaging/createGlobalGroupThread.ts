/**
 * VTID-04936 — create a legacy global group thread (global_message_threads)
 * the way its RLS allows. Shared by NewConversationPopup and CreateGroupPopup
 * so the two dialogs can't drift apart again.
 *
 * Why it is shaped like this:
 * - The thread id is generated here and the insert has NO `.select()`.
 *   global_message_threads' SELECT policy is is_participant_of_global_thread(id),
 *   and right after the insert nobody is a participant yet — a
 *   select-after-insert (Prefer: return=representation) is rejected with 403
 *   and the whole insert rolls back.
 * - The creator is inserted FIRST, on their own ("Users can join threads as
 *   themselves", user_id = auth.uid()). The members go in a SECOND statement:
 *   their policy ("Thread creators can add participants") can only see the
 *   thread once the creator's participant row is committed.
 *
 * Tenant context (message_threads / thread_participants) is not handled: its
 * thread_participants has no creator-adds-members policy, so a tenant group
 * can't be created from the client at all. See TENANT_GROUP_CREATE_UNSUPPORTED.
 */
import { v4 as uuidv4 } from "uuid";

/** Logged when a dialog refuses tenant-context group creation before any write. */
export const TENANT_GROUP_CREATE_UNSUPPORTED = "tenant_group_create_unsupported";

// Narrow structural type so tests can pass a fake; the real supabase client fits.
export interface InsertOnlyClient {
  from(table: string): {
    insert(values: unknown): PromiseLike<{ error: unknown }>;
  };
}

export interface CreateGlobalGroupThreadInput {
  userId: string;
  userEmail?: string | null;
  name: string;
  memberIds: string[];
}

export async function createGlobalGroupThread(
  client: InsertOnlyClient,
  { userId, userEmail, name, memberIds }: CreateGlobalGroupThreadInput,
): Promise<string> {
  const threadId = uuidv4();

  const { error: threadError } = await client
    .from("global_message_threads")
    .insert({ id: threadId, created_by: userId, type: "group", name });
  if (threadError) throw threadError;

  const { error: adminError } = await client
    .from("global_thread_participants")
    .insert({ thread_id: threadId, user_id: userId, role: "admin" });
  if (adminError) throw adminError;

  const members = [...new Set(memberIds)].filter((id) => id !== userId);
  if (members.length > 0) {
    const { error: membersError } = await client
      .from("global_thread_participants")
      .insert(members.map((id) => ({ thread_id: threadId, user_id: id, role: "member" })));
    if (membersError) throw membersError;
  }

  // Best effort, as before: the group exists even if this fails.
  try {
    const { error: messageError } = await client.from("global_messages").insert({
      thread_id: threadId,
      sender_id: userId,
      body: `${userEmail ?? ""} created the group`,
      message_type: "system",
      content_data: { system_type: "group_created", group_name: name, created_by: userId },
    });
    if (messageError) console.warn("Group created, system message failed:", messageError);
  } catch (e) {
    console.warn("Group created, system message failed:", e);
  }

  return threadId;
}
