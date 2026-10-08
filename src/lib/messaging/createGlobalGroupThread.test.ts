// VTID-04936 — group creation from the Messenger dialogs.
//
// What this proves: the call sequence the RLS on global_message_threads /
// global_thread_participants needs — client-generated id, no select-after-
// insert, creator alone first, members in a later statement.
// What it cannot prove: the real policies. No isolated Supabase exists and
// staging writes to production, so correctness against RLS rests on the
// policy analysis in docs/validation/VTID-04936/plan-sparring.md and on the
// owner creating a group after release.
import { describe, it, expect, vi } from "vitest";
import { createGlobalGroupThread, type InsertOnlyClient } from "./createGlobalGroupThread";

type Row = Record<string, unknown>;
type Call = { table: string; values: Row | Row[] };

function fakeClient(errors: Record<number, unknown> = {}, throwOn?: string) {
  const calls: Call[] = [];
  const select = vi.fn();
  const client: InsertOnlyClient = {
    from(table: string) {
      return {
        insert(values: unknown) {
          const i = calls.length;
          calls.push({ table, values: values as Row | Row[] });
          if (throwOn === table) return Promise.reject(new Error("network"));
          // A thenable with .select attached: calling it would be the bug.
          return Object.assign(Promise.resolve({ error: errors[i] ?? null }), { select });
        },
      };
    },
  };
  return { client, calls, select };
}

const ME = "11111111-1111-4111-8111-111111111111";
const A = "22222222-2222-4222-8222-222222222222";
const B = "33333333-3333-4333-8333-333333333333";

describe("createGlobalGroupThread", () => {
  it("inserts the thread with a client id and never selects it back", async () => {
    const { client, calls, select } = fakeClient();
    const id = await createGlobalGroupThread(client, { userId: ME, userName: "Dragan", name: "Lauftreff", memberIds: [A, B] });

    expect(calls[0].table).toBe("global_message_threads");
    expect(calls[0].values).toEqual({ id, created_by: ME, type: "group", name: "Lauftreff" });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(select).not.toHaveBeenCalled();
  });

  it("adds the creator alone as admin before the members, in separate inserts", async () => {
    const { client, calls } = fakeClient();
    const id = await createGlobalGroupThread(client, { userId: ME, name: "g", memberIds: [A, B] });

    expect(calls[1]).toEqual({ table: "global_thread_participants", values: { thread_id: id, user_id: ME, role: "admin" } });
    expect(calls[2].table).toBe("global_thread_participants");
    expect(calls[2].values).toEqual([
      { thread_id: id, user_id: A, role: "member" },
      { thread_id: id, user_id: B, role: "member" },
    ]);
    expect(calls[3].table).toBe("global_messages");
    expect(calls[3].values).toMatchObject({ thread_id: id, sender_id: ME, message_type: "system" });
  });

  it("does not add the creator or a duplicate as a member", async () => {
    const { client, calls } = fakeClient();
    await createGlobalGroupThread(client, { userId: ME, name: "g", memberIds: [A, ME, A] });
    expect((calls[2].values as Row[]).map((r) => r.user_id)).toEqual([A]);
  });

  it("throws a thread-insert error and writes nothing else", async () => {
    const err = { code: "42501", message: "new row violates row-level security policy" };
    const { client, calls } = fakeClient({ 0: err });
    await expect(createGlobalGroupThread(client, { userId: ME, name: "g", memberIds: [A] })).rejects.toBe(err);
    expect(calls).toHaveLength(1);
  });

  it("throws a creator or member insert error", async () => {
    const e1 = { code: "42501" };
    await expect(createGlobalGroupThread(fakeClient({ 1: e1 }).client, { userId: ME, name: "g", memberIds: [A] })).rejects.toBe(e1);
    const e2 = { code: "42501" };
    await expect(createGlobalGroupThread(fakeClient({ 2: e2 }).client, { userId: ME, name: "g", memberIds: [A] })).rejects.toBe(e2);
  });

  it("still returns the group when the system message fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const a = fakeClient({ 3: { code: "x" } });
    await expect(createGlobalGroupThread(a.client, { userId: ME, name: "g", memberIds: [A] })).resolves.toMatch(/^[0-9a-f-]{36}$/);
    const b = fakeClient({}, "global_messages");
    await expect(createGlobalGroupThread(b.client, { userId: ME, name: "g", memberIds: [A] })).resolves.toMatch(/^[0-9a-f-]{36}$/);
    warn.mockRestore();
  });

  it("VTID-04955: the created notice carries a display name, never an email", async () => {
    const { client, calls } = fakeClient();
    await createGlobalGroupThread(client, { userId: ME, userName: "Dragan", name: "g", memberIds: [A] });
    expect(calls[3].values).toMatchObject({ body: "Dragan created the group", content_data: { actor_name: "Dragan" } });

    const leak = fakeClient();
    await createGlobalGroupThread(leak.client, { userId: ME, userName: "me@hotmail.com", name: "g", memberIds: [A] });
    expect(JSON.stringify(leak.calls[3].values)).not.toContain("@");
  });
});
