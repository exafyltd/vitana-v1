/**
 * VTID-05155 — one `/api/v1`, never two.
 *
 * Every build sets `VITE_GATEWAY_URL` to the gateway origin PLUS `/api/v1`
 * (`.env`, the stage/prod/preview deploy workflows). Four pages built their
 * base from that value and then added `/api/v1/...` again, so every request
 * went to `/api/v1/api/v1/...` — a 404 on staging and in production:
 * the admin marketplace Overview / Products / Partner Health pages and the
 * member page /settings/limitations. They now use `GATEWAY_BASE` from
 * `@/lib/gateway-base` (the bare origin).
 *
 *  (a) A source scan: no module-level constant built from VITE_GATEWAY_URL
 *      (without stripping its `/api/v1`) may be used as `${X}/api/v1` in the
 *      same file. Known cases outside this fix are listed with a reason.
 *  (b) Render: PartnerHealthOrders and Limitations, with the build's env,
 *      request `https://gw.example/api/v1/...` exactly once-prefixed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { render, waitFor, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

const { passthrough, nothing } = vi.hoisted(() => ({
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));
vi.mock("@/lib/i18n-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n-toast")>();
  return { ...actual, notify: vi.fn(), notifyError: vi.fn() };
});
vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
vi.mock("@/components/SEO", () => ({ default: nothing }));
vi.mock("@/components/StandardHeader", () => ({ default: nothing }));
vi.mock("@/components/SubNavigation", () => ({ default: nothing }));
vi.mock("@/hooks/useSpotlightEnabled", () => ({ useSpotlightEnabled: () => false }));

// ---------------------------------------------------------------------------
// (a) Source scan
// ---------------------------------------------------------------------------

const SRC = resolve(__dirname, "../..");
const ROOT = resolve(SRC, "..");

/**
 * Files that still double the prefix, deliberately left out of VTID-05155.
 * Each needs its own check (is the backend route dead, or mounted elsewhere?).
 */
const KNOWN_OUTSIDE_SCOPE: Record<string, string> = {
  "src/hooks/useReleaseBacklog.ts": "calls /api/v1/releases/* — no releases router is mounted in the gateway, so a single prefix would still 404",
  "src/hooks/useReleaseHistory.ts": "calls /api/v1/releases/* — no releases router is mounted in the gateway, so a single prefix would still 404",
  "src/hooks/useReleasesOverview.ts": "calls /api/v1/releases/* — no releases router is mounted in the gateway, so a single prefix would still 404",
  "src/pages/Changelog.tsx": "not routed in App.tsx",
  "src/pages/dev/DevDocsBacklog.tsx": "not routed in App.tsx",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

/** `const X = <expr>;` at module level whose expr reads VITE_GATEWAY_URL. */
const DECL = /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=([\s\S]*?);\s*$/gm;

function doubledPrefixSites(): string[] {
  const hits: string[] = [];
  for (const abs of walk(SRC)) {
    const src = readFileSync(abs, "utf8");
    if (!src.includes("VITE_GATEWAY_URL")) continue;
    for (const m of src.matchAll(DECL)) {
      const [, name, expr] = m;
      if (!expr.includes("VITE_GATEWAY_URL")) continue;
      // A constant that strips the suffix (`.replace(/\/api\/v1\/?$/, "")`) is safe.
      if (expr.includes("api\\/v1")) continue;
      if (!src.includes("${" + name + "}/api/v1")) continue;
      const line = src.slice(0, m.index).split("\n").length;
      hits.push(`${relative(ROOT, abs)}:${line} ${name}`);
    }
  }
  return hits;
}

describe("gateway prefix — source scan (VTID-05155)", () => {
  it("no file adds /api/v1 to a base built from VITE_GATEWAY_URL", () => {
    const offenders = doubledPrefixSites().filter((h) => !(h.split(":")[0] in KNOWN_OUTSIDE_SCOPE));
    expect(offenders).toEqual([]);
  });

  it("the four fixed pages import GATEWAY_BASE and no longer read VITE_GATEWAY_URL in code", () => {
    for (const f of [
      "src/pages/admin/marketplace/PartnerHealthOrders.tsx",
      "src/pages/admin/marketplace/Overview.tsx",
      "src/pages/admin/marketplace/Products.tsx",
      "src/pages/settings/Limitations.tsx",
    ]) {
      const src = readFileSync(resolve(ROOT, f), "utf8");
      expect(src, f).toMatch(/import \{ GATEWAY_BASE \} from "@\/lib\/gateway-base"/);
      expect(src, f).not.toMatch(/import\.meta\.env\.VITE_GATEWAY_URL/);
    }
  });

  it("every listed exception still exists (drop it from the list once fixed)", () => {
    const sites = doubledPrefixSites().map((h) => h.split(":")[0]);
    for (const f of Object.keys(KNOWN_OUTSIDE_SCOPE)) expect(sites, f).toContain(f);
  });
});

// ---------------------------------------------------------------------------
// (b) Render with the build's env
// ---------------------------------------------------------------------------

const ENVS: Array<[string, Record<string, string>]> = [
  // What every deploy workflow sets.
  ["VITE_GATEWAY_BASE + VITE_GATEWAY_URL", { VITE_GATEWAY_BASE: "https://gw.example", VITE_GATEWAY_URL: "https://gw.example/api/v1" }],
  // Only the /api/v1 value set.
  ["VITE_GATEWAY_URL only", { VITE_GATEWAY_BASE: "", VITE_GATEWAY_URL: "https://gw.example/api/v1" }],
];

describe.each(ENVS)("gateway prefix — rendered pages, %s (VTID-05155)", (_label, env) => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      const body = String(url).includes("/partner-health/inbox") ? { inbox: [] } : String(url).includes("/partner-health/orders") ? { orders: [] } : {};
      return { ok: true, status: 200, json: async () => body };
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function requested(): string[] {
    return fetchMock.mock.calls.map(([u]) => String(u));
  }

  it("PartnerHealthOrders requests /api/v1/admin/partner-health/* once-prefixed", { timeout: 30_000 }, async () => {
    const { default: PartnerHealthOrders } = await import("../admin/marketplace/PartnerHealthOrders");
    render(<PartnerHealthOrders />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requested().sort()).toEqual([
      "https://gw.example/api/v1/admin/partner-health/inbox",
      "https://gw.example/api/v1/admin/partner-health/orders",
    ]);
    for (const u of requested()) expect(u).not.toContain("/api/v1/api/v1");
  });

  it("Limitations (member page) requests /api/v1/user/limitations[/impact] once-prefixed", { timeout: 30_000 }, async () => {
    const { default: Limitations } = await import("../settings/Limitations");
    render(<Limitations />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requested().sort()).toEqual([
      "https://gw.example/api/v1/user/limitations",
      "https://gw.example/api/v1/user/limitations/impact",
    ]);
    for (const u of requested()) {
      expect(u.startsWith("https://gw.example/api/v1/")).toBe(true);
      expect(u).not.toContain("/api/v1/api/v1");
    }
  });
});
