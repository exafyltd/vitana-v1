/**
 * VTID-04500 (Community Autopilot CA-2): the Autopilot lineup follows the
 * member's active role instead of a hard-coded "community".
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let mobile = false;
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mobile }));
vi.mock("@/hooks/useTenant", () => ({ useTenantSafe: () => ({ activeTenantId: "t-1" }) }));

import { useAutopilotRole } from "./useAutopilotRole";

function setup(role: string | null) {
  const qc = new QueryClient();
  if (role !== null) qc.setQueryData(["rolePref", "t-1"], role);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...renderHook(() => useAutopilotRole(), { wrapper }) };
}

describe("useAutopilotRole", () => {
  beforeEach(() => {
    mobile = false;
  });

  it("defaults to community when no role preference is cached", () => {
    expect(setup(null).result.current).toBe("community");
  });

  it("follows the cached role preference and switches when it changes", () => {
    const { qc, result } = setup("developer");
    expect(result.current).toBe("developer");
    act(() => {
      qc.setQueryData(["rolePref", "t-1"], "community");
    });
    expect(result.current).toBe("community");
  });

  it("is always community on mobile, like useRole().currentRole", () => {
    mobile = true;
    expect(setup("developer").result.current).toBe("community");
  });
});

describe("use-autopilot sends the active role, never a hard-coded community", () => {
  const src = readFileSync(resolve(process.cwd(), "src/hooks/use-autopilot.ts"), "utf8");
  it("has no literal role=community and uses the role hook", () => {
    expect(src).not.toContain("role=community");
    expect(src).not.toContain('"X-Vitana-Active-Role": "community"');
    expect(src).toContain("useAutopilotRole()");
  });
});
