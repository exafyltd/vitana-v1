/**
 * VTID-05056 (Health Hub Phase 0 / D8), staff side.
 *
 *  - Upload-result bodies carry no `partner_key` at all: the gateway takes the
 *    partner from the order itself (it used to default every upload to
 *    DoctorBox, checking the wrong consent and labelling the wrong source).
 *  - confirm-match is now a proposal: the gateway answers
 *    202 { ok, status: 'pending_member', inbox_id } and the member decides.
 *    The success toast says the member was asked; 409 MEMBER_DECLINED,
 *    400 USER_NOT_IN_TENANT, 503 MEMBER_CONFIRMATION_UNAVAILABLE and
 *    409 PENDING_MEMBER each get their own translated error toast.
 *  - Inbox rows show the member's state and cannot be re-proposed while one
 *    is pending.
 *
 * Covers both callers: the Vitana admin page (inline fetch) and the partner
 * org's Commerce page (React Query hooks over adminFetch).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n-toast";

const { adminFetch, notify, notifyError, passthrough, nothing } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  passthrough: ({ children }: { children?: ReactNode }) => children ?? null,
  nothing: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } } }) } },
}));
vi.mock("@/lib/admin-api", () => ({ adminFetch }));
vi.mock("@/lib/i18n-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n-toast")>();
  return { ...actual, notify, notifyError };
});
vi.mock("@/components/AppLayout", () => ({ default: passthrough }));
vi.mock("@/components/SEO", () => ({ default: nothing }));
vi.mock("@/components/StandardHeader", () => ({ default: nothing }));
vi.mock("@/components/commerce/CommerceShell", () => ({
  CommerceShell: passthrough,
  useCommerceSkin: () => ({ inApp: false, portalClass: "" }),
}));
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "staff-1" } }) }));
vi.mock("@/hooks/useOrgMembers", () => ({
  useMyPartnerOrgs: () => ({ data: [{ role: "staff" }], isLoading: false }),
}));

import PartnerHealthOrders from "../admin/marketplace/PartnerHealthOrders";
import CommerceHealthOrders from "../CommerceHealthOrders";
import { confirmMatchErrorKey, memberLinkBadgeKey } from "@/hooks/usePartnerHealthOrders";

const ORDER = {
  id: "order-1",
  tenant_id: "tenant-1",
  user_id: "user-1",
  partner_id: "partner-1",
  assigned_professional_user_id: null,
  external_order_ref: null,
  test_name: "Lipid panel",
  status: "processing",
  status_updated_at: "2026-10-09T10:00:00.000Z",
  ordered_at: "2026-10-09T10:00:00.000Z",
  partner_registry: { display_name: "Labor Nord" },
};

const INBOX_ROW = {
  id: "inbox-1",
  partner_id: "partner-1",
  raw_payload: {},
  candidate_user_ids: [],
  reason: "no_match",
  resolved: false,
  created_at: "2026-10-09T10:00:00.000Z",
  partner_registry: { display_name: "Labor Nord" },
  member_link_status: null,
};

const PROPOSED = { ok: true, status: "pending_member", inbox_id: "inbox-1" };

const ERROR_CASES: Array<[number, string, string]> = [
  [409, "MEMBER_DECLINED", "toasts.admin.matchMemberDeclined"],
  [400, "USER_NOT_IN_TENANT", "toasts.admin.matchUserNotInTenant"],
  [503, "MEMBER_CONFIRMATION_UNAVAILABLE", "toasts.admin.matchConfirmationUnavailable"],
  [409, "PENDING_MEMBER", "toasts.admin.matchAlreadyPending"],
];

beforeEach(() => {
  adminFetch.mockReset();
  notify.mockReset();
  notifyError.mockReset();
});

function fillAndSubmitConfirmMatch() {
  fireEvent.change(screen.getByPlaceholderText(t("screens.admin.matchedUserId")), { target: { value: "user-9" } });
  fireEvent.change(screen.getByPlaceholderText(t("screens.admin.matchedTenantId")), { target: { value: "tenant-9" } });
  fireEvent.change(screen.getByPlaceholderText(t("screens.admin.testName")), { target: { value: "Lipid panel" } });
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: t("screens.admin.confirmMatch") }));
}

function openInboxTab() {
  const tab = screen.getByRole("tab", { name: new RegExp(t("screens.admin.inbox")) });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  fireEvent.click(tab);
}

// ---------------------------------------------------------------------------
// Vitana admin page — inline fetch against the gateway
// ---------------------------------------------------------------------------

describe("admin PartnerHealthOrders (VTID-05056)", () => {
  const fetchMock = vi.fn();

  function json(status: number, body: unknown) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }

  function routeFetch(confirmResponse: () => unknown, inboxRow: Record<string, unknown> = INBOX_ROW) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET" && url.endsWith("/admin/partner-health/orders")) return json(200, { orders: [ORDER] });
      if (method === "GET" && url.endsWith("/admin/partner-health/inbox")) return json(200, { inbox: [inboxRow] });
      if (method === "POST" && url.endsWith("/confirm-match")) return confirmResponse();
      if (method === "POST" && url.endsWith("/upload-result")) return json(200, { ok: true });
      throw new Error(`unexpected ${method} ${url}`);
    });
  }

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("upload-result sends no partner_key", async () => {
    routeFetch(() => json(202, PROPOSED));
    render(<PartnerHealthOrders />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(t("screens.admin.uploadResult")) }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: '{"biomarkers":[]}' } });
    fireEvent.click(screen.getByRole("button", { name: t("screens.admin.upload") }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.admin.resultUploaded"));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/upload-result") && init?.method === "POST");
    const body = JSON.parse(String(call![1].body));
    expect(body).toEqual({ order_id: "order-1", result: { biomarkers: [] } });
    expect("partner_key" in body).toBe(false);
  });

  it("202 pending_member toasts that the member was asked, not that a match was confirmed", async () => {
    routeFetch(() => json(202, PROPOSED));
    render(<PartnerHealthOrders />);
    await screen.findByRole("button", { name: new RegExp(t("screens.admin.uploadResult")) });
    openInboxTab();
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(t("screens.admin.resolve")) }));
    fillAndSubmitConfirmMatch();

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.admin.matchProposed"));
    expect(notify).not.toHaveBeenCalledWith("screens.admin.matchConfirmed");
    expect(notifyError).not.toHaveBeenCalled();
    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/inbox/inbox-1/confirm-match"));
    expect(JSON.parse(String(call![1].body))).toEqual({
      matched_user_id: "user-9",
      matched_tenant_id: "tenant-9",
      test_name: "Lipid panel",
      external_order_ref: null,
    });
  });

  it.each(ERROR_CASES)("%i %s shows its own translated error toast", async (status, code, key) => {
    routeFetch(() => json(status, { ok: false, error: code }));
    render(<PartnerHealthOrders />);
    await screen.findByRole("button", { name: new RegExp(t("screens.admin.uploadResult")) });
    openInboxTab();
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(t("screens.admin.resolve")) }));
    fillAndSubmitConfirmMatch();

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(key));
    expect(notify).not.toHaveBeenCalledWith("screens.admin.matchProposed");
  });

  it("a row waiting for the member shows the badge and cannot be re-proposed", async () => {
    routeFetch(() => json(202, PROPOSED), { ...INBOX_ROW, member_link_status: "pending_member" });
    render(<PartnerHealthOrders />);
    await screen.findByRole("button", { name: new RegExp(t("screens.admin.uploadResult")) });
    openInboxTab();
    expect(await screen.findByText(t("screens.admin.awaitingMember"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(t("screens.admin.resolve")) })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Partner org Commerce page — React Query hooks over adminFetch
// ---------------------------------------------------------------------------

describe("CommerceHealthOrders (VTID-05056)", () => {
  function renderPage(path = "/commerce/health-orders") {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[path]}>
          <CommerceHealthOrders />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  function routeAdminFetch(confirm: () => unknown, inboxRow: Record<string, unknown> = INBOX_ROW) {
    adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (method === "GET" && path === "/api/v1/admin/partner-health/orders") return { orders: [ORDER] };
      if (method === "GET" && path === "/api/v1/admin/partner-health/inbox") return { inbox: [inboxRow] };
      if (method === "POST" && path.endsWith("/confirm-match")) return confirm();
      if (method === "POST" && path.endsWith("/upload-result")) return { ok: true };
      throw new Error(`unexpected ${method} ${path}`);
    });
  }

  it("upload-result sends no partner_key", async () => {
    routeAdminFetch(() => PROPOSED);
    renderPage();
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(t("screens.admin.uploadResult")) }))[0]);
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: '{"biomarkers":[]}' } });
    fireEvent.click(screen.getByRole("button", { name: t("screens.admin.upload") }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.admin.resultUploaded"));
    const call = adminFetch.mock.calls.find(([path]) => String(path).endsWith("/upload-result"));
    const body = JSON.parse(String(call![1].body));
    expect(body).toEqual({ order_id: "order-1", result: { biomarkers: [] } });
    expect("partner_key" in body).toBe(false);
  });

  it("202 pending_member toasts that the member was asked", async () => {
    routeAdminFetch(() => PROPOSED);
    renderPage("/commerce/health-orders/inbox");
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(t("screens.admin.resolve")) }))[0]);
    fillAndSubmitConfirmMatch();

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.admin.matchProposed"));
    expect(notify).not.toHaveBeenCalledWith("screens.admin.matchConfirmed");
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/v1/admin/partner-health/inbox/inbox-1/confirm-match",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it.each(ERROR_CASES)("%i %s shows its own translated error toast", async (_status, code, key) => {
    // adminFetch throws Error(body.error) on a non-2xx answer.
    routeAdminFetch(() => {
      throw new Error(code);
    });
    renderPage("/commerce/health-orders/inbox");
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(t("screens.admin.resolve")) }))[0]);
    fillAndSubmitConfirmMatch();

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(key));
    expect(notify).not.toHaveBeenCalledWith("screens.admin.matchProposed");
  });

  it("a row waiting for the member shows the badge and cannot be re-proposed", async () => {
    routeAdminFetch(() => PROPOSED, { ...INBOX_ROW, member_link_status: "pending_member" });
    renderPage("/commerce/health-orders/inbox");
    expect((await screen.findAllByText(t("screens.admin.awaitingMember"))).length).toBeGreaterThan(0);
    for (const b of screen.getAllByRole("button", { name: new RegExp(t("screens.admin.resolve")) })) {
      expect(b).toBeDisabled();
    }
  });
});

// ---------------------------------------------------------------------------
// Shared helpers and source guards
// ---------------------------------------------------------------------------

describe("staff helpers and sources (VTID-05056)", () => {
  it("maps each gateway code to its key and anything else to the generic failure", () => {
    for (const [, code, key] of ERROR_CASES) expect(confirmMatchErrorKey(new Error(code))).toBe(key);
    expect(confirmMatchErrorKey(new Error("HTTP 500"))).toBe("toasts.admin.bulkActionFailed");
    expect(confirmMatchErrorKey("nope")).toBe("toasts.admin.bulkActionFailed");
  });

  it("badges only pending and declined rows", () => {
    expect(memberLinkBadgeKey("pending_member")).toBe("screens.admin.awaitingMember");
    expect(memberLinkBadgeKey("declined")).toBe("screens.admin.memberDeclined");
    expect(memberLinkBadgeKey("confirmed")).toBeNull();
    expect(memberLinkBadgeKey(null)).toBeNull();
    expect(memberLinkBadgeKey(undefined)).toBeNull();
  });

  it("every new staff key resolves in the catalog", () => {
    for (const key of [
      "screens.admin.matchProposed",
      "screens.admin.awaitingMember",
      "screens.admin.memberDeclined",
      ...ERROR_CASES.map(([, , k]) => k),
    ]) {
      expect(t(key), key).not.toBe(key);
      expect(t(key), key).not.toMatch(/missing/);
    }
  });

  it("no staff caller sends partner_key any more", () => {
    for (const rel of ["../../hooks/usePartnerHealthOrders.ts", "../admin/marketplace/PartnerHealthOrders.tsx"]) {
      const src = readFileSync(resolve(__dirname, rel), "utf8")
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
        .join("\n");
      expect(src, rel).not.toMatch(/partner_key/);
    }
  });
});
