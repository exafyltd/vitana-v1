/**
 * VTID-04406 — Mail, Calendar & Contacts panel.
 *
 * Pins: all nine apps render with a real switch; switches follow the hub's
 * state; an OAuth app hands the consent URL to the browser; Apple asks for
 * an Apple ID + app-specific password and sends it once; turning off asks
 * first and only removes imported contacts when ticked; an app the backend
 * cannot serve has a disabled switch; every mailhub key exists in all eleven
 * locales with the same placeholders.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ConnectedAppState } from "@/lib/connected-apps-client";

vi.mock("@/lib/i18n-toast", () => ({
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock("@/lib/locale-format", () => ({ formatDistanceToNow: () => "5 min ago" }));
const { redirect, client } = vi.hoisted(() => ({
  redirect: vi.fn(),
  client: {
    fetchConnectedApps: vi.fn(),
    connectApp: vi.fn(),
    disconnectApp: vi.fn(),
    syncConnectedApp: vi.fn(),
    importAndroidContacts: vi.fn(),
    pickDeviceContacts: vi.fn(),
    contactPickerSupported: vi.fn(() => false),
  },
}));
vi.mock("@/lib/webview", () => ({ isAppilixWebView: () => false, redirectViaSystemBrowser: (u: string) => redirect(u) }));
vi.mock("@/lib/connected-apps-client", async () => {
  const real = await vi.importActual<typeof import("@/lib/connected-apps-client")>("@/lib/connected-apps-client");
  return { ...real, ...client };
});

import { MailCalendarContactsPanel } from "./MailCalendarContactsPanel";

const IDS = ["gmail", "outlook-mail", "apple-mail", "google-calendar", "outlook-calendar", "apple-calendar", "google-contacts", "iphone-contacts", "android-contacts"] as const;

function app(id: (typeof IDS)[number], over: Partial<ConnectedAppState> = {}): ConnectedAppState {
  const provider = id.startsWith("g") ? "google" : id.startsWith("outlook") ? "microsoft" : id.startsWith("android") ? "device" : "apple";
  const kind = id.includes("mail") ? "mail" : id.includes("calendar") ? "calendar" : "contacts";
  return {
    id, provider, kind,
    method: provider === "apple" ? "app_password" : provider === "device" ? "device" : "oauth",
    availability: "ready", status: "off", account: null, syncs: kind !== "mail",
    last_sync_at: null, last_result: null, last_error: null, ...over,
  } as ConnectedAppState;
}

function renderPanel(apps: ConnectedAppState[]) {
  client.fetchConnectedApps.mockResolvedValue(apps);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MailCalendarContactsPanel />
    </QueryClientProvider>,
  );
}

const toggle = (id: string) => screen.getByTestId(`mailhub-toggle-${id}`);

describe("MailCalendarContactsPanel", () => {
  beforeEach(() => {
    Object.values(client).forEach((f) => (f as any).mockReset?.());
    client.contactPickerSupported.mockReturnValue(false);
    redirect.mockReset();
    window.history.replaceState({}, "", "/settings/connected-apps");
  });

  it("renders the nine apps with switches that follow the hub state", async () => {
    renderPanel(IDS.map((id) => app(id, id === "gmail" ? { status: "on", account: "ana@x.com" } : {})));
    await waitFor(() => expect(toggle("gmail")).toHaveAttribute("aria-checked", "true"));
    for (const id of IDS) expect(screen.getByTestId(`mailhub-row-${id}`)).toBeInTheDocument();
    expect(toggle("outlook-mail")).toHaveAttribute("aria-checked", "false");
    expect(within(screen.getByTestId("mailhub-row-gmail")).getByText("ana@x.com")).toBeInTheDocument();
  });

  it("an OAuth app sends the member to the provider's consent screen", async () => {
    client.connectApp.mockResolvedValue({ status: "consent_required", auth_url: "https://login.microsoftonline.com/x" });
    renderPanel(IDS.map((id) => app(id)));
    await waitFor(() => expect(toggle("outlook-mail")).not.toBeDisabled());
    fireEvent.click(toggle("outlook-mail"));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith("https://login.microsoftonline.com/x"));
    expect(client.connectApp).toHaveBeenCalledWith("outlook-mail", { return: "web" });
  });

  it("Apple asks for an Apple ID and app-specific password first, then sends them", async () => {
    client.connectApp.mockResolvedValue({ status: "on" });
    renderPanel(IDS.map((id) => app(id)));
    await waitFor(() => expect(toggle("apple-calendar")).not.toBeDisabled());
    fireEvent.click(toggle("apple-calendar"));
    const dialog = await screen.findByTestId("mailhub-apple-dialog");
    const submit = within(dialog).getByTestId("mailhub-apple-submit");
    expect(submit).toBeDisabled();
    const [idInput, pwInput] = dialog.querySelectorAll("input");
    fireEvent.change(idInput, { target: { value: "me@icloud.com" } });
    fireEvent.change(pwInput, { target: { value: "abcd-efgh-ijkl-mnop" } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(client.connectApp).toHaveBeenCalledWith("apple-calendar", { return: "web", apple_id: "me@icloud.com", app_password: "abcd-efgh-ijkl-mnop" }),
    );
  });

  it("a second Apple app turns on without asking again", async () => {
    client.connectApp.mockResolvedValue({ status: "on" });
    renderPanel(IDS.map((id) => app(id, id === "apple-mail" ? { status: "on", account: "me@icloud.com" } : {})));
    await waitFor(() => expect(toggle("iphone-contacts")).not.toBeDisabled());
    fireEvent.click(toggle("iphone-contacts"));
    await waitFor(() => expect(client.connectApp).toHaveBeenCalledWith("iphone-contacts", { return: "web" }));
    expect(screen.queryByTestId("mailhub-apple-dialog")).toBeNull();
  });

  it("turning off asks first, and removes imported contacts only when ticked", async () => {
    client.disconnectApp.mockResolvedValue({ provider_released: false });
    renderPanel(IDS.map((id) => app(id, id === "google-contacts" ? { status: "on" } : {})));
    await waitFor(() => expect(toggle("google-contacts")).toHaveAttribute("aria-checked", "true"));
    fireEvent.click(toggle("google-contacts"));
    const dialog = await screen.findByTestId("mailhub-off-dialog");
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByTestId("mailhub-off-confirm"));
    await waitFor(() => expect(client.disconnectApp).toHaveBeenCalledWith("google-contacts", true));
  });

  it("an app the backend cannot serve has a disabled switch", async () => {
    renderPanel(IDS.map((id) => app(id, id.startsWith("outlook") ? { availability: "not_configured" } : {})));
    await waitFor(() => expect(toggle("gmail")).not.toBeDisabled());
    expect(toggle("outlook-mail")).toBeDisabled();
    expect(within(screen.getByTestId("mailhub-row-outlook-mail")).getByText("mailhub.status.notAvailable")).toBeInTheDocument();
  });

  it("Android without the contact picker explains where to do it instead of failing", async () => {
    renderPanel(IDS.map((id) => app(id)));
    await waitFor(() => expect(toggle("android-contacts")).not.toBeDisabled());
    fireEvent.click(toggle("android-contacts"));
    expect(await screen.findByText(/mailhub.android.title/)).toBeInTheDocument();
    expect(client.importAndroidContacts).not.toHaveBeenCalled();
  });
});

describe("mailhub strings", () => {
  const dir = path.resolve(__dirname, "../../../i18n");
  // `_pending_review` (any `_`-prefixed key) is translate-pipeline metadata, not a string.
  const flat = (o: any, p = ""): Record<string, string> =>
    Object.entries(o).filter(([k]) => !k.startsWith("_")).reduce((acc, [k, v]) => (typeof v === "object" ? { ...acc, ...flat(v, `${p}${k}.`) } : { ...acc, [`${p}${k}`]: v as string }), {});
  const de = flat(JSON.parse(fs.readFileSync(path.join(dir, "de/mailhub.json"), "utf8")));
  const locales = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, "common.json")));

  it("exist in every shipped locale with the same keys and placeholders", () => {
    expect(locales.length).toBeGreaterThanOrEqual(11);
    for (const loc of locales) {
      const f = flat(JSON.parse(fs.readFileSync(path.join(dir, loc, "mailhub.json"), "utf8")));
      expect(Object.keys(f).sort()).toEqual(Object.keys(de).sort());
      for (const k of Object.keys(de)) {
        expect((f[k].match(/\{\w+\}/g) ?? []).sort()).toEqual((de[k].match(/\{\w+\}/g) ?? []).sort());
      }
    }
  });

  it("German is du-form", () => {
    expect(Object.values(de).join(" ")).not.toMatch(/\b(Sie|Ihr|Ihnen|Ihre)\b/);
  });

  it("the panel uses no key that is missing", () => {
    const src = fs.readFileSync(path.join(__dirname, "MailCalendarContactsPanel.tsx"), "utf8");
    const used = Array.from(src.matchAll(/"(mailhub\.[a-zA-Z.]+)"/g)).map((m) => m[1]);
    for (const k of used) expect(Object.keys(de).some((d) => d === k || d.startsWith(`${k}.`))).toBe(true);
  });
});
