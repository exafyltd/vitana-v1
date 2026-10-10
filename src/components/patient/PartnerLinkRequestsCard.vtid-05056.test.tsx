/**
 * VTID-05056 (Health Hub Phase 0 / D8): a partner result reaches the member
 * only after the member confirms it. The card lists the pending requests from
 * GET /api/v1/partner-health/member/link-requests, confirms or declines them
 * with the member's own POST, refreshes both the requests and the results, and
 * stays out of the way (renders nothing) when there is nothing to show or the
 * request fails — it never blocks the Results page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { t } from "@/lib/i18n-toast";

const { adminFetch, notify, notifyError } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({ adminFetch }));
vi.mock("@/lib/i18n-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n-toast")>();
  return { ...actual, notify, notifyError };
});
vi.mock("@/components/AppLayout", () => ({ default: ({ children }: { children?: ReactNode }) => children ?? null }));

import { PartnerLinkRequestsCard } from "./PartnerLinkRequestsCard";
import PatientResults from "@/pages/patient/Results";

const LIST = "/api/v1/partner-health/member/link-requests";

const REQUEST = {
  id: "11111111-1111-1111-1111-111111111111",
  partner_display_name: "Labor Nord",
  test_name: "Lipid panel",
  proposed_at: "2026-10-09T10:00:00.000Z",
};

function renderWithClient(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, "invalidateQueries");
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return { qc, invalidate };
}

function routeFetch(handlers: Record<string, () => unknown>) {
  adminFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${path}`;
    const h = handlers[key];
    if (!h) throw new Error(`unexpected ${key}`);
    return h();
  });
}

beforeEach(() => {
  adminFetch.mockReset();
  notify.mockReset();
  notifyError.mockReset();
});

describe("PartnerLinkRequestsCard (VTID-05056)", () => {
  it("lists each pending request with partner, test, proposed date and both actions", async () => {
    routeFetch({ [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }) });
    renderWithClient(<PartnerLinkRequestsCard />);

    expect(await screen.findByText("Lipid panel")).toBeInTheDocument();
    expect(screen.getByText("Labor Nord")).toBeInTheDocument();
    expect(screen.getByText(t("screens.patient.results.linkRequests.title"))).toBeInTheDocument();
    expect(screen.getByText(t("screens.patient.results.linkRequests.body"))).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: t("screens.patient.results.linkRequests.confirm") })).toBeEnabled();
    expect(screen.getByRole("button", { name: t("screens.patient.results.linkRequests.decline") })).toBeEnabled();
    expect(screen.getAllByTestId("partner-link-request")).toHaveLength(1);
    expect(adminFetch).toHaveBeenCalledWith(LIST);
  });

  it("falls back to a generic partner label when the partner has no display name", async () => {
    routeFetch({ [`GET ${LIST}`]: () => ({ ok: true, requests: [{ ...REQUEST, partner_display_name: "" }] }) });
    renderWithClient(<PartnerLinkRequestsCard />);
    expect(await screen.findByText(t("screens.patient.results.linkRequests.unknownPartner"))).toBeInTheDocument();
  });

  it("renders nothing for an empty list", async () => {
    routeFetch({ [`GET ${LIST}`]: () => ({ ok: true, requests: [] }) });
    renderWithClient(<PartnerLinkRequestsCard />);
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("partner-link-requests")).toBeNull();
  });

  it("renders nothing when the request fails (old gateway, migration pending, network)", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => {
        throw new Error("HTTP 404");
      },
    });
    renderWithClient(<PartnerLinkRequestsCard />);
    await waitFor(() => expect(adminFetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("partner-link-requests")).toBeNull();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("Confirm asks once more, then POSTs /confirm and refreshes requests and results", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }),
      [`POST ${LIST}/${REQUEST.id}/confirm`]: () => ({ ok: true, status: "confirmed", order_id: "o1" }),
    });
    const { invalidate } = renderWithClient(<PartnerLinkRequestsCard />);

    fireEvent.click(await screen.findByRole("button", { name: t("screens.patient.results.linkRequests.confirm") }));
    // Nothing is sent until the member confirms in the dialog.
    expect(adminFetch).not.toHaveBeenCalledWith(expect.stringContaining("/confirm"), expect.anything());
    expect(await screen.findByText(t("screens.patient.results.linkRequests.confirmDialogTitle"))).toBeInTheDocument();
    expect(
      screen.getByText(t("screens.patient.results.linkRequests.confirmDialogBody", { partner: "Labor Nord", test: "Lipid panel" })),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t("screens.patient.results.linkRequests.confirmDialogAction") }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.patient.results.linkRequests.confirmed"));
    expect(adminFetch).toHaveBeenCalledWith(`${LIST}/${REQUEST.id}/confirm`, { method: "POST" });
    expect(adminFetch).not.toHaveBeenCalledWith(expect.stringContaining("/decline"), expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["partner-link-requests"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["patient-health-results"] });
  });

  it("Cancel in the dialog sends nothing", async () => {
    routeFetch({ [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }) });
    renderWithClient(<PartnerLinkRequestsCard />);
    fireEvent.click(await screen.findByRole("button", { name: t("screens.patient.results.linkRequests.confirm") }));
    fireEvent.click(await screen.findByRole("button", { name: t("screens.patient.results.linkRequests.cancel") }));
    await waitFor(() =>
      expect(screen.queryByText(t("screens.patient.results.linkRequests.confirmDialogTitle"))).toBeNull(),
    );
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });

  it("Not me POSTs /decline and refreshes requests and results", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }),
      [`POST ${LIST}/${REQUEST.id}/decline`]: () => ({ ok: true, status: "declined" }),
    });
    const { invalidate } = renderWithClient(<PartnerLinkRequestsCard />);

    fireEvent.click(await screen.findByRole("button", { name: t("screens.patient.results.linkRequests.decline") }));

    await waitFor(() => expect(notify).toHaveBeenCalledWith("screens.patient.results.linkRequests.declined"));
    expect(adminFetch).toHaveBeenCalledWith(`${LIST}/${REQUEST.id}/decline`, { method: "POST" });
    expect(adminFetch).not.toHaveBeenCalledWith(expect.stringContaining("/confirm"), expect.anything());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["partner-link-requests"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["patient-health-results"] });
  });

  it("a failed decision shows the translated error toast", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }),
      [`POST ${LIST}/${REQUEST.id}/decline`]: () => {
        throw new Error("NOT_PENDING");
      },
    });
    renderWithClient(<PartnerLinkRequestsCard />);
    fireEvent.click(await screen.findByRole("button", { name: t("screens.patient.results.linkRequests.decline") }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith("screens.patient.results.linkRequests.failed"));
  });

  it("every key it uses resolves in the catalog", () => {
    for (const k of [
      "title",
      "body",
      "proposedOn",
      "unknownPartner",
      "confirm",
      "decline",
      "confirmDialogTitle",
      "confirmDialogBody",
      "confirmDialogAction",
      "cancel",
      "confirmed",
      "declined",
      "failed",
    ]) {
      const key = `screens.patient.results.linkRequests.${k}`;
      expect(t(key), key).not.toBe(key);
      expect(t(key), key).not.toMatch(/missing/);
    }
  });

  it("uses logical (RTL-safe) spacing and alignment only", () => {
    const src = readFileSync(resolve(__dirname, "PartnerLinkRequestsCard.tsx"), "utf8");
    expect(src).not.toMatch(/\b(ml|mr|pl|pr|left|right|text-left|text-right|rounded-l|rounded-r|border-l|border-r)-/);
    expect(src).not.toMatch(/\btext-(left|right)\b/);
  });
});

describe("Patient Results page with the card (VTID-05056)", () => {
  it("shows the results even when the link-requests call fails", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => {
        throw new Error("HTTP 503");
      },
      "GET /api/v1/patient/health-results": () => ({ results: [] }),
    });
    renderWithClient(<PatientResults />);
    expect(await screen.findByText(t("screens.patient.results.empty"))).toBeInTheDocument();
    expect(screen.queryByTestId("partner-link-requests")).toBeNull();
  });

  it("shows the card under the page header when a request is pending", async () => {
    routeFetch({
      [`GET ${LIST}`]: () => ({ ok: true, requests: [REQUEST] }),
      "GET /api/v1/patient/health-results": () => ({ results: [] }),
    });
    renderWithClient(<PatientResults />);
    const card = await screen.findByTestId("partner-link-requests");
    const heading = screen.getByText(t("screens.patient.results.title"));
    expect(heading.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
