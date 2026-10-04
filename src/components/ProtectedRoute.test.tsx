/**
 * VTID-04867 — a role-gated page stays mounted when get_role_preference fails.
 *
 * A query that never succeeded goes back to "pending" on every refetch, and the
 * page's own useRole() refetches when it mounts. ProtectedRoute used to answer
 * every "pending" with the loader, which unmounted the page, which remounted and
 * refetched: the calendar flickered in and out for as long as the RPC failed
 * (STAGING-VERIFY: vcal-page visible, then vcal-add "not found").
 */
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ rpc: vi.fn(), mounts: 0 }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: h.rpc } }));
vi.mock("@/hooks/useTenant", () => ({ useTenant: () => ({ activeTenantId: "t1", isExafyAdmin: false }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/ui/DelayedLoader", () => ({ DelayedLoader: () => <div data-testid="loader" /> }));
vi.mock("@/pages/NotAuthorized", () => ({ default: () => <div data-testid="not-authorized" /> }));

import ProtectedRoute from "./ProtectedRoute";
import { useRole } from "@/hooks/useRole";

/** Like CalendarPage: a page that reads the role itself. */
function Page() {
  useRole();
  useEffect(() => {
    h.mounts += 1;
  }, []);
  return <div data-testid="page" />;
}

function renderGuarded() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProtectedRoute requiredRole="community">
        <Page />
      </ProtectedRoute>
    </QueryClientProvider>,
  );
}

describe("ProtectedRoute (VTID-04867)", () => {
  beforeEach(() => {
    h.mounts = 0;
    h.rpc.mockReset();
  });

  it("shows the loader first, then the page", async () => {
    h.rpc.mockResolvedValue({ data: [{ role: "community" }], error: null });
    renderGuarded();
    expect(screen.getByTestId("loader")).toBeInTheDocument();
    await screen.findByTestId("page");
  });

  it("keeps the page mounted when the role lookup keeps failing", async () => {
    h.rpc.mockResolvedValue({ data: null, error: { message: "aborted" } });
    renderGuarded();
    await screen.findByTestId("page");
    // Give the mount-triggered refetches every chance to flap the page.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(screen.queryByTestId("loader")).toBeNull();
    expect(h.mounts).toBe(1);
  });

  it("still denies a role the member does not have", async () => {
    h.rpc.mockResolvedValue({ data: [{ role: "community" }], error: null });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ProtectedRoute requiredRole="admin">
          <Page />
        </ProtectedRoute>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("not-authorized")).toBeInTheDocument());
    expect(h.mounts).toBe(0);
  });
});
