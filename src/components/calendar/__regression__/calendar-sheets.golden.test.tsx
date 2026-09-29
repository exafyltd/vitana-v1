/**
 * VTID-04459 — app calendar regression suite: "Show in my calendar app".
 *
 * The subscription-link sheet (create once, copy, replace, turn off) and the
 * Google two-way sync card (hidden until configured, on/off, needing a
 * Google connection first) — rendered against a scripted gateway and
 * compared with __golden__/calendar-sheets.json.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { assertBerlin, expectGolden } from "./golden";
import { outline } from "./outline";

const G = "calendar-sheets";
const h = vi.hoisted(() => ({
  fetchFeedStatus: vi.fn(),
  createFeedLink: vi.fn(),
  revokeFeedLink: vi.fn(),
  fetchGoogleSyncStatus: vi.fn(),
  enableGoogleSync: vi.fn(),
  disableGoogleSync: vi.fn(),
  connect: vi.fn(),
  notify: vi.fn(),
  notifyError: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: vi.fn() } } }));
vi.mock("@/hooks/useGoogleConnect", () => ({ useStartUnifiedGoogleConnect: () => ({ mutate: h.connect, isPending: false }) }));
vi.mock("react-router-dom", async () => ({ ...(await vi.importActual<object>("react-router-dom")), useNavigate: () => h.navigate }));
vi.mock("@/lib/i18n-toast", async () => ({ ...(await vi.importActual<object>("@/lib/i18n-toast")), notify: h.notify, notifyError: h.notifyError }));
vi.mock("@/lib/calendar-window-client", async () => {
  const real = await vi.importActual<typeof import("@/lib/calendar-window-client")>("@/lib/calendar-window-client");
  const { navigate: _n, connect: _c, notify: _no, notifyError: _ne, ...client } = h;
  return { ...real, ...client };
});

import { SubscribeSheet } from "../vcal/SubscribeSheet";
import { GoogleSyncCard } from "../vcal/GoogleSyncCard";

function mount(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>{node}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const OFF = { availability: "ready", enabled: false, last_push_at: null, last_error: null };
const ON = { availability: "ready", enabled: true, last_push_at: "2026-10-05T07:00:00Z", last_error: null };

beforeAll(() => assertBerlin());
beforeEach(() => {
  for (const f of Object.values(h)) f.mockReset();
  h.fetchFeedStatus.mockResolvedValue({ active: false, created_at: null, last_used_at: null });
  h.fetchGoogleSyncStatus.mockResolvedValue({ availability: "not_configured", enabled: false, last_push_at: null, last_error: null });
});

describe("subscription sheet", () => {
  it("no link yet → create shows it once, with copy and open-in-app", async () => {
    h.createFeedLink.mockResolvedValue("https://gateway.example/api/v1/calendar/feed/tok.ics");
    const { container } = mount(<SubscribeSheet onClose={() => {}} />);
    await waitFor(() => expect((screen.getByTestId("vcal-subscribe-create") as HTMLButtonElement).disabled).toBe(false));
    expectGolden(G, "subscribe.none", outline(container));
    fireEvent.click(screen.getByTestId("vcal-subscribe-create"));
    await screen.findByTestId("vcal-subscribe-fresh");
    expectGolden(G, "subscribe.fresh", outline(container));
    const open = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expectGolden(G, "subscribe.fresh.links", open);
  });

  it("active link → replace or turn off", async () => {
    h.fetchFeedStatus.mockResolvedValue({ active: true, created_at: "2026-09-01T10:00:00Z", last_used_at: null });
    h.revokeFeedLink.mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { container } = mount(<SubscribeSheet onClose={onClose} />);
    await screen.findByTestId("vcal-subscribe-active");
    expectGolden(G, "subscribe.active", outline(container));
    fireEvent.click(screen.getByTestId("vcal-subscribe-revoke"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.subscribe.revoked"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("a failed create says so", async () => {
    h.createFeedLink.mockRejectedValue(new Error("down"));
    mount(<SubscribeSheet onClose={() => {}} />);
    await waitFor(() => expect((screen.getByTestId("vcal-subscribe-create") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("vcal-subscribe-create"));
    await waitFor(() => expect(h.notifyError).toHaveBeenCalledWith("vcal.subscribe.error"));
  });
});

describe("Google sync card", () => {
  it("hidden while not configured", async () => {
    const { container } = mount(<GoogleSyncCard />);
    await waitFor(() => expect(h.fetchGoogleSyncStatus).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe("");
  });

  it("off → turn on; Google not connected yet → asks Google for the sync permission", async () => {
    h.fetchGoogleSyncStatus.mockResolvedValue(OFF);
    h.enableGoogleSync.mockResolvedValue("needs_google");
    const { container } = mount(<GoogleSyncCard />);
    await screen.findByTestId("vcal-google-toggle");
    expectGolden(G, "google.off", outline(container));
    fireEvent.click(screen.getByTestId("vcal-google-toggle"));
    await waitFor(() => expect(h.connect).toHaveBeenCalledWith({ include: ["calendar_sync"], mode: "incremental" }));
    expect(h.notify).not.toHaveBeenCalled();
  });

  it("on, with last sync and a problem → turn off", async () => {
    h.fetchGoogleSyncStatus.mockResolvedValue({ ...ON, last_error: "token_revoked" });
    h.disableGoogleSync.mockResolvedValue(undefined);
    const { container } = mount(<GoogleSyncCard />);
    await screen.findByTestId("vcal-google-on");
    expectGolden(G, "google.on", outline(container));
    fireEvent.click(screen.getByTestId("vcal-google-toggle"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.google.turnedOff"));
  });

  it("turning on works when Google is connected", async () => {
    h.fetchGoogleSyncStatus.mockResolvedValue(OFF);
    h.enableGoogleSync.mockResolvedValue("enabled");
    mount(<GoogleSyncCard />);
    fireEvent.click(await screen.findByTestId("vcal-google-toggle"));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith("vcal.google.turnedOn"));
  });
});
