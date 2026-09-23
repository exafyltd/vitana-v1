/* eslint-disable @typescript-eslint/no-explicit-any -- scripted Supabase chain in a test */
/**
 * VTID-04440 — "Find friends" (Messages → Contacts, Invite friends) imports
 * through the Connected Apps hub instead of saying "coming soon".
 *
 * Pins: Google / iCloud that are on sync through the hub and the result is
 * read back for the preview; one that is off opens a "connect first" step
 * that leads to Connected Apps; the phone book goes through the hub's
 * device import; nothing writes contacts from the browser; WhatsApp (no
 * import path) is no longer offered; every new string exists in all
 * eleven locales.
 */
import fs from "fs";
import path from "path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/i18n-toast", () => ({
  t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  notify: vi.fn(),
  notifyError: vi.fn(),
}));
const { client, db, navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
  client: {
    fetchConnectedApps: vi.fn(),
    syncConnectedApp: vi.fn(),
    importAndroidContacts: vi.fn(),
    pickDeviceContacts: vi.fn(),
    contactPickerSupported: vi.fn(() => true),
  },
  db: { rows: [] as any[], writes: [] as string[], lastIn: null as any },
}));
vi.mock("@/lib/connected-apps-client", () => client);
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...real, useNavigate: () => navigate };
});
vi.mock("@/context/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/integrations/supabase/client", () => {
  const q: any = {
    select: () => q, eq: () => q, order: () => q,
    in: (col: string, vals: any) => { db.lastIn = { col, vals }; return q; },
    limit: async () => ({ data: db.rows, error: null }),
    then: (res: any) => res({ data: [], error: null }),
    upsert: () => { db.writes.push("upsert"); return Promise.resolve({ error: null }); },
    insert: () => { db.writes.push("insert"); return Promise.resolve({ error: null }); },
  };
  return { supabase: { from: () => q } };
});

import { ContactSyncModal } from "./ContactSyncModal";

const hubApp = (id: string, status: "on" | "off") => ({ id, status });

function open() {
  localStorage.setItem("contact_sync_consent_u1", "true");
  return render(
    <MemoryRouter>
      <ContactSyncModal open onOpenChange={() => undefined} />
    </MemoryRouter>,
  );
}

async function pickAndFind(nameKey: string) {
  fireEvent.click(await screen.findByText(nameKey));
  fireEvent.click(screen.getAllByText("screens.contacts.findFriends").pop()!);
}

beforeEach(() => {
  vi.clearAllMocks();
  db.rows = [];
  db.writes = [];
  db.lastIn = null;
  client.contactPickerSupported.mockReturnValue(true);
});

describe("Find friends through Connected Apps", () => {
  it("offers Google, iCloud and the phone book — not WhatsApp — and marks the ones already on", async () => {
    client.fetchConnectedApps.mockResolvedValue([hubApp("google-contacts", "on"), hubApp("iphone-contacts", "off")]);
    open();
    expect(await screen.findByText("mailhub.apps.google-contacts.name")).toBeTruthy();
    expect(screen.getByText("mailhub.apps.iphone-contacts.name")).toBeTruthy();
    expect(screen.getByText("mailhub.apps.android-contacts.name")).toBeTruthy();
    expect(screen.queryByText(/WhatsApp/i)).toBeNull();
    await waitFor(() => expect(screen.getByText("mailhub.findFriends.status.on")).toBeTruthy());
    expect(screen.getByText("mailhub.findFriends.status.off")).toBeTruthy();
  });

  it("Google on: syncs through the hub and previews what was imported", async () => {
    client.fetchConnectedApps.mockResolvedValue([hubApp("google-contacts", "on")]);
    client.syncConnectedApp.mockResolvedValue({ ok: true, result: { imported: 2 } });
    db.rows = [
      { id: "c1", contact_name: "Ana", contact_phone: null, contact_email: "ana@x.com", contact_user_id: null, is_on_platform: false },
      { id: "c2", contact_name: "Bo", contact_phone: "+49 1", contact_email: null, contact_user_id: null, is_on_platform: false },
    ];
    open();
    await pickAndFind("mailhub.apps.google-contacts.name");
    await waitFor(() => expect(client.syncConnectedApp).toHaveBeenCalledWith("google-contacts"));
    expect(db.lastIn).toEqual({ col: "source", vals: ["google"] });
    expect(db.writes).toEqual([]); // nothing written from the browser
  });

  it("iCloud off: shows a connect step that leads to Connected Apps", async () => {
    client.fetchConnectedApps.mockResolvedValue([hubApp("iphone-contacts", "off")]);
    open();
    await pickAndFind("mailhub.apps.iphone-contacts.name");
    expect(await screen.findByText(/mailhub\.findFriends\.connect\.title/)).toBeTruthy();
    expect(client.syncConnectedApp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("find-friends-open-connected-apps"));
    expect(navigate).toHaveBeenCalledWith("/connectors");
  });

  it("phone book: picked contacts go to the hub's device import", async () => {
    client.fetchConnectedApps.mockResolvedValue([]);
    client.pickDeviceContacts.mockResolvedValue([{ name: ["Ana"], tel: ["+49 1"] }]);
    client.importAndroidContacts.mockResolvedValue({ imported: 1 });
    open();
    await pickAndFind("mailhub.apps.android-contacts.name");
    await waitFor(() => expect(client.importAndroidContacts).toHaveBeenCalledWith([{ name: ["Ana"], tel: ["+49 1"] }]));
    await waitFor(() => expect(db.lastIn).toEqual({ col: "source", vals: ["android"] }));
    expect(db.writes).toEqual([]);
  });

  it("phone book picked nothing: a translated 'no contacts picked' screen, not raw English", async () => {
    client.fetchConnectedApps.mockResolvedValue([]);
    client.pickDeviceContacts.mockResolvedValue([]);
    open();
    await pickAndFind("mailhub.apps.android-contacts.name");
    expect(await screen.findByText("mailhub.findFriends.errors.cancelled.title")).toBeTruthy();
    expect(screen.getByText("mailhub.findFriends.errors.cancelled.body")).toBeTruthy();
  });
});

describe("consent", () => {
  it("is translated and makes no claim that contacts stay on the device", async () => {
    localStorage.clear();
    client.fetchConnectedApps.mockResolvedValue([]);
    render(<MemoryRouter><ContactSyncModal open onOpenChange={() => undefined} /></MemoryRouter>);
    expect(await screen.findByText("mailhub.findFriends.consent.privateTitle")).toBeTruthy();
    expect(screen.getByText("mailhub.findFriends.consent.helper")).toBeTruthy();
    const src = fs.readFileSync(path.resolve(__dirname, "ContactConsentCard.tsx"), "utf8");
    expect(src).not.toMatch(/never leaves your device|hashed locally/i);
  });
});

describe("findFriends strings", () => {
  const I18N = path.resolve(__dirname, "../../i18n");
  const flat = (o: any, p = ""): Record<string, string> =>
    Object.entries(o).reduce((acc, [k, v]) => (typeof v === "string" ? { ...acc, [p + k]: v } : { ...acc, ...flat(v, `${p}${k}.`) }), {} as Record<string, string>);
  const load = (l: string) => flat(JSON.parse(fs.readFileSync(path.join(I18N, l, "mailhub.json"), "utf8")).mailhub.findFriends);

  it("exist in all eleven locales with the same keys and placeholders", () => {
    const de = load("de");
    for (const l of ["en", "es", "fr", "pl", "pt", "ru", "sr", "tr", "zh", "ar"]) {
      const other = load(l);
      expect(Object.keys(other).sort()).toEqual(Object.keys(de).sort());
      for (const k of Object.keys(de)) {
        expect((other[k].match(/\{\w+\}/g) ?? []).sort()).toEqual((de[k].match(/\{\w+\}/g) ?? []).sort());
      }
    }
  });

  it("every error type the screen can show has a title and a body", () => {
    const de = load("de");
    for (const type of ["oauth_failed", "api_unavailable", "permission_denied", "rate_limited", "cancelled", "unknown"]) {
      expect(de[`errors.${type}.title`]).toBeTruthy();
      expect(de[`errors.${type}.body`]).toBeTruthy();
    }
  });
});
