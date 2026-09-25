/**
 * VTID-04590 — which new members has the viewer already greeted?
 *
 * The new-member card asks the viewer to say hello. Once the viewer has sent
 * that member a direct message, the card has done its job and is hidden for
 * that viewer. Only messages the VIEWER sent count: every new member
 * automatically sends a "Hello" DM to all members on joining (VTID-03089),
 * so counting either direction would hide every card the moment it appears.
 *
 * Fails open: on a query error the cards stay visible (a duplicate reminder
 * is better than hiding a newcomer nobody has greeted).
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchGreetedMemberIds(
  viewerId: string | null,
  memberIds: string[],
): Promise<Set<string>> {
  const greeted = new Set<string>();
  const ids = [...new Set(memberIds)].filter(Boolean);
  if (!viewerId || !ids.length) return greeted;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("receiver_id")
    .eq("sender_id", viewerId)
    .is("group_id", null)
    .in("receiver_id", ids)
    .limit(ids.length * 20);

  if (error) {
    console.error("[new-member-greeted] Error reading sent chat_messages (cards stay visible):", error);
    return greeted;
  }
  for (const row of (data as { receiver_id: string | null }[]) || []) {
    if (row.receiver_id) greeted.add(row.receiver_id);
  }
  return greeted;
}
