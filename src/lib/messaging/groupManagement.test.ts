// VTID-04955 — rename / remove must not report success when RLS blocked them.
import { describe, it, expect } from "vitest";
import { renameGlobalGroup, deactivateParticipant, NoRowUpdatedError, type UpdateClient } from "./groupManagement";

function fake(result: { data: unknown[] | null; error: unknown }) {
  const calls: Array<{ table: string; values: Record<string, unknown>; eq: [string, string]; select: string }> = [];
  const client: UpdateClient = {
    from(table) {
      return {
        update(values) {
          return {
            eq(column, value) {
              return {
                select(columns) {
                  calls.push({ table, values, eq: [column, value], select: columns });
                  return Promise.resolve(result);
                },
              };
            },
          };
        },
      };
    },
  };
  return { client, calls };
}

describe("renameGlobalGroup", () => {
  it("updates the name by id and asks for the row back", async () => {
    const f = fake({ data: [{ id: "t1" }], error: null });
    await renameGlobalGroup(f.client, "t1", "  Lauftreff  ");
    expect(f.calls).toEqual([{ table: "global_message_threads", values: { name: "Lauftreff" }, eq: ["id", "t1"], select: "id" }]);
  });

  it("treats 0 rows (RLS: error null, data []) as failure", async () => {
    await expect(renameGlobalGroup(fake({ data: [], error: null }).client, "t1", "x")).rejects.toBeInstanceOf(NoRowUpdatedError);
    await expect(renameGlobalGroup(fake({ data: null, error: null }).client, "t1", "x")).rejects.toBeInstanceOf(NoRowUpdatedError);
  });

  it("rejects empty and over-long names without writing", async () => {
    const f = fake({ data: [{ id: "t1" }], error: null });
    await expect(renameGlobalGroup(f.client, "t1", "   ")).rejects.toBeInstanceOf(RangeError);
    await expect(renameGlobalGroup(f.client, "t1", "x".repeat(81))).rejects.toBeInstanceOf(RangeError);
    expect(f.calls).toHaveLength(0);
  });

  it("passes a PostgREST error through", async () => {
    const err = { code: "42501" };
    await expect(renameGlobalGroup(fake({ data: null, error: err }).client, "t1", "x")).rejects.toBe(err);
  });
});

describe("deactivateParticipant", () => {
  it("sets is_active false on that row and requires exactly one row back", async () => {
    const f = fake({ data: [{ id: "p1" }], error: null });
    await deactivateParticipant(f.client, "global_thread_participants", "p1");
    expect(f.calls[0]).toEqual({ table: "global_thread_participants", values: { is_active: false }, eq: ["id", "p1"], select: "id" });
  });

  it("reports the silent RLS block that made remove-member look successful", async () => {
    await expect(deactivateParticipant(fake({ data: [], error: null }).client, "global_thread_participants", "p1")).rejects.toBeInstanceOf(NoRowUpdatedError);
  });
});
