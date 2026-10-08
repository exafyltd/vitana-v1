/**
 * VTID-04955 — group writes that must not fail silently.
 *
 * Under RLS a blocked UPDATE returns `{ error: null, data: [] }`: no error, no
 * row. The members modal used to treat that as success ("Mitglied entfernt")
 * while the member stayed in the group. Both helpers ask for the updated id
 * back and require exactly one row.
 */

export class NoRowUpdatedError extends Error {
  constructor(what: string) {
    super(`${what}: no row was updated (not permitted or not found)`);
    this.name = "NoRowUpdatedError";
  }
}

type UpdateResult = PromiseLike<{ data: unknown[] | null; error: unknown }>;

export interface UpdateClient {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): { select(columns: string): UpdateResult };
    };
  };
}

async function updateOne(
  client: UpdateClient,
  table: string,
  id: string,
  values: Record<string, unknown>,
  what: string,
): Promise<void> {
  const { data, error } = await client.from(table).update(values).eq("id", id).select("id");
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== 1) throw new NoRowUpdatedError(what);
}

/** Rename a global group thread. Only its creator may (RLS). */
export async function renameGlobalGroup(client: UpdateClient, threadId: string, name: string): Promise<void> {
  const next = name.trim();
  if (next.length < 1 || next.length > 80) throw new RangeError("group name must be 1-80 characters");
  await updateOne(client, "global_message_threads", threadId, { name: next }, "rename group");
}

/** Mark a participant row inactive (remove a member, or leave the group). */
export async function deactivateParticipant(client: UpdateClient, table: string, participantId: string): Promise<void> {
  await updateOne(client, table, participantId, { is_active: false }, "deactivate participant");
}
