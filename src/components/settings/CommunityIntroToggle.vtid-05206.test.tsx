/**
 * VTID-05206 — Settings → Privacy: "Introduce me to the community".
 * The switch shows the member's own global_community_profiles.community_intro_opt_in
 * and writes only that column, only on their own row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const calls: Array<{ table: string; op: string; args: unknown[] }> = [];
let readResult: { data: unknown; error: unknown } = { data: { community_intro_opt_in: true }, error: null };
let writeResult: { error: unknown } = { error: null };

type Settle = (v: unknown) => unknown;
type Builder = Record<string, (...a: never[]) => unknown>;
function builder(table: string) {
  let write = false;
  const b: Builder = {
    select: (...a: unknown[]) => { calls.push({ table, op: "select", args: a }); return b; },
    update: (...a: unknown[]) => { calls.push({ table, op: "update", args: a }); write = true; return b; },
    eq: (...a: unknown[]) => { calls.push({ table, op: "eq", args: a }); return b; },
    maybeSingle: () => Promise.resolve(readResult),
    then: (res: Settle, rej: Settle) => Promise.resolve(write ? writeResult : readResult).then(res, rej),
  };
  return b;
}

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (t: string) => builder(t) } }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
const notifyError = vi.fn();
vi.mock("@/lib/i18n-toast", () => ({ t: (k: string) => k, notifyError: (...a: unknown[]) => notifyError(...a) }));

import { CommunityIntroToggle } from "./CommunityIntroToggle";

function renderToggle() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><CommunityIntroToggle /></QueryClientProvider>);
}

beforeEach(() => {
  calls.length = 0;
  notifyError.mockClear();
  readResult = { data: { community_intro_opt_in: true }, error: null };
  writeResult = { error: null };
});

describe("CommunityIntroToggle (VTID-05206)", () => {
  it("reads the member's own row and shows the switch on", async () => {
    renderToggle();
    const sw = await screen.findByTestId("community-intro-switch");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("screens.settings.communityIntroTitle")).toBeTruthy();
    expect(screen.getByText("screens.settings.communityIntroBody")).toBeTruthy();
    expect(calls).toContainEqual({ table: "global_community_profiles", op: "select", args: ["community_intro_opt_in"] });
    expect(calls).toContainEqual({ table: "global_community_profiles", op: "eq", args: ["user_id", "me"] });
  });

  it("shows off for a member who is not introduced, and for a missing row", async () => {
    readResult = { data: { community_intro_opt_in: false }, error: null };
    const { unmount } = renderToggle();
    expect((await screen.findByTestId("community-intro-switch")).getAttribute("aria-checked")).toBe("false");
    unmount();
    readResult = { data: null, error: null };
    renderToggle();
    expect((await screen.findByTestId("community-intro-switch")).getAttribute("aria-checked")).toBe("false");
  });

  it("switching off writes only community_intro_opt_in=false on the member's own row", async () => {
    renderToggle();
    fireEvent.click(await screen.findByTestId("community-intro-switch"));
    await waitFor(() => expect(screen.getByTestId("community-intro-switch").getAttribute("aria-checked")).toBe("false"));
    const updates = calls.filter((c) => c.op === "update");
    expect(updates).toEqual([{ table: "global_community_profiles", op: "update", args: [{ community_intro_opt_in: false }] }]);
    const eqs = calls.filter((c) => c.op === "eq").map((c) => c.args);
    expect(eqs.every(([col, val]) => col === "user_id" && val === "me")).toBe(true);
  });

  it("switching on again writes true", async () => {
    readResult = { data: { community_intro_opt_in: false }, error: null };
    renderToggle();
    fireEvent.click(await screen.findByTestId("community-intro-switch"));
    await waitFor(() => expect(calls.some((c) => c.op === "update")).toBe(true));
    expect(calls.find((c) => c.op === "update")?.args).toEqual([{ community_intro_opt_in: true }]);
  });

  it("a failed save tells the member and keeps the old state", async () => {
    writeResult = { error: { message: "nope" } };
    renderToggle();
    fireEvent.click(await screen.findByTestId("community-intro-switch"));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("screens.settings.communityIntroSaveFailed"));
    expect(screen.getByTestId("community-intro-switch").getAttribute("aria-checked")).toBe("true");
  });

  it("hides itself when the setting cannot be read", async () => {
    readResult = { data: null, error: { message: "column does not exist" } };
    renderToggle();
    await waitFor(() => expect(calls.some((c) => c.op === "select")).toBe(true));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("community-intro")).toBeNull();
  });
});
