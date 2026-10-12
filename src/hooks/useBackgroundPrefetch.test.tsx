/**
 * VTID-05081 — the pillar prefetch fan-out runs once per session, not once
 * per AppLayout. Every page mounts its own AppLayout (and with it this hook),
 * so a per-instance "already prefetched" ref re-ran all of /home's adjacent
 * pillars (intent-board, global messages, …) on every return to News.
 */
import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ prefetch: vi.fn(), userId: "u1", tenantId: "t1" }));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: h.userId } }) }));
vi.mock("@/hooks/useTenant", () => ({ useTenantSafe: () => ({ activeTenantId: h.tenantId }) }));
vi.mock("@/lib/prefetch-registry", () => ({
  ADJACENT_PILLARS: { "/home": ["/comm", "/inbox", "/autopilot"] },
  prefetchForPath: h.prefetch,
}));

import { useBackgroundPrefetch, __resetBackgroundPrefetch } from "./useBackgroundPrefetch";

function Layout() {
  useBackgroundPrefetch();
  return null;
}

const qc = new QueryClient();
function mountLayout() {
  const view = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/home"]}>
        <Layout />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  act(() => {
    vi.advanceTimersByTime(300); // past the 250 ms debounce
  });
  return view;
}

const prefetchedPaths = () => h.prefetch.mock.calls.map((c) => c[1]);

describe("useBackgroundPrefetch (VTID-05081)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetBackgroundPrefetch();
    h.prefetch.mockReset();
    h.prefetch.mockResolvedValue(undefined);
    h.userId = "u1";
    h.tenantId = "t1";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prefetches each pillar once across two AppLayout mounts", () => {
    mountLayout().unmount();
    expect(prefetchedPaths()).toEqual(["/comm", "/inbox", "/autopilot"]);
    mountLayout().unmount();
    expect(h.prefetch).toHaveBeenCalledTimes(3);
  });

  it("prefetches again after a user change, and after a tenant change", () => {
    mountLayout().unmount();
    h.userId = "u2";
    mountLayout().unmount();
    expect(h.prefetch).toHaveBeenCalledTimes(6);
    expect(h.prefetch.mock.calls[3][2]).toBe("u2");
    h.tenantId = "t2";
    mountLayout().unmount();
    expect(h.prefetch).toHaveBeenCalledTimes(9);
    expect(h.prefetch.mock.calls[6][3]).toBe("t2");
  });
});
