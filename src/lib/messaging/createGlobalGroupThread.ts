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
import { noticeName } from "./groupSystemNotice";

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
  /** Display name for the "created the group" notice — never an email (VTID-04955). */
  userName?: string | null;
  name: string;
  memberIds: string[];
}

export async function createGlobalGroupThread(
  client: InsertOnlyClient,
  { userId, userName, name, memberIds }: CreateGlobalGroupThreadInput,
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

  // Best effort, as before: the group exists even if this fails. The body is
  // only a fallback; the chat renders this notice from i18n (groupSystemNotice).
  const actorName = noticeName({ display_name: userName });
  try {
    const { error: messageError } = await client.from("global_messages").insert({
      thread_id: threadId,
      sender_id: userId,
      body: `${actorName || "Someone"} created the group`,
      message_type: "system",
      content_data: { system_type: "group_created", group_name: name, created_by: userId, actor_name: actorName },
    });
    if (messageError) console.warn("Group created, system message failed:", messageError);
  } catch (e) {
    console.warn("Group created, system message failed:", e);
  }

  return threadId;
}

/** The signed-in member's display name for notices (global profile; never an email). */
export interface ProfileReadClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): PromiseLike<{ data: { display_name?: string | null } | null }>;
      };
    };
  };
}

export async function fetchMyNoticeName(
  client: ProfileReadClient,
  userId: string,
): Promise<string> {
  try {
    const { data } = await client
      .from("global_community_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();
    return noticeName(data);
  } catch {
    return "";
  }
}
