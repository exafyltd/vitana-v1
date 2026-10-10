/**
 * VTID-04406 — client for the gateway Connected Apps hub (VTID-04402).
 *
 * The nine mail / calendar / contacts apps each have one toggle. The gateway
 * decides what "on" means (a provider grant that covers the app, a stored
 * Apple sign-in, or contacts picked on an Android phone), so the screen
 * never shows a Connect button the backend cannot honour.
 *
 *   GET  /api/v1/connected-apps
 *   POST /api/v1/connected-apps/:id/connect      → { status: 'on' } | { status: 'consent_required', auth_url }
 *   POST /api/v1/connected-apps/:id/disconnect
 *   POST /api/v1/connected-apps/:id/sync
 *   POST /api/v1/connected-apps/android-contacts/import  (VTID-05058: picker, .vcf or native)
 *   DELETE /api/v1/connected-apps/android-contacts       (VTID-05058)
 */

import { GATEWAY_BASE } from "@/lib/gateway-base";
import { getAccessToken } from "@/lib/cached-access-token";

export type ConnectedAppId =
  | "gmail"
  | "google-calendar"
  | "google-contacts"
  | "outlook-mail"
  | "outlook-calendar"
  | "outlook-contacts"
  | "apple-mail"
  | "apple-calendar"
  | "iphone-contacts"
  | "android-contacts";

export type AppKind = "mail" | "calendar" | "contacts";
export type AppStatus = "off" | "on" | "needs_reconnect";

export interface ConnectedAppState {
  id: ConnectedAppId;
  provider: "google" | "microsoft" | "apple" | "device";
  kind: AppKind;
  method: "oauth" | "app_password" | "device";
  availability: "ready" | "not_configured";
  status: AppStatus;
  account: string | null;
  syncs: boolean;
  last_sync_at: string | null;
  last_result: Record<string, unknown> | null;
  last_error: string | null;
}

export class ConnectedAppsError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
    this.name = "ConnectedAppsError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON bodies, narrowed by each caller below
async function call(path: string, init: RequestInit = {}): Promise<any> {
  // VTID-04536: the in-memory token, not getSession() — that queues on the
  // auth lock behind every other request fired when a screen opens.
  const token = await getAccessToken();
  const resp = await fetch(`${GATEWAY_BASE}/api/v1/connected-apps${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json?.ok === false) {
    throw new ConnectedAppsError(resp.status, String(json?.error ?? `http_${resp.status}`));
  }
  return json;
}

export async function fetchConnectedApps(): Promise<ConnectedAppState[]> {
  const json = await call("");
  return (json.apps ?? []) as ConnectedAppState[];
}

export type ConnectOutcome =
  | { status: "on"; sync?: { ok: boolean; result?: Record<string, unknown>; error?: string } }
  | { status: "consent_required"; auth_url: string };

export async function connectApp(
  id: ConnectedAppId,
  body: { return?: "mobile" | "web"; apple_id?: string; app_password?: string } = {},
): Promise<ConnectOutcome> {
  const json = await call(`/${id}/connect`, { method: "POST", body: JSON.stringify(body) });
  return json.status === "consent_required"
    ? { status: "consent_required", auth_url: String(json.auth_url) }
    : { status: "on", sync: json.sync };
}

export async function disconnectApp(id: ConnectedAppId, removeData = false): Promise<{ provider_released: boolean }> {
  const json = await call(`/${id}/disconnect`, { method: "POST", body: JSON.stringify({ remove_data: removeData }) });
  return { provider_released: !!json.provider_released };
}

export async function syncConnectedApp(id: ConnectedAppId): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  return call(`/${id}/sync`, { method: "POST" });
}

export interface PickedContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

/** Contacts from the browser Contact Picker (Android Chrome). */
/** VTID-05058: one contact as the phone hands it over (picker, .vcf file or native app). */
export interface DeviceContact {
  name: string;
  emails: string[];
  phones: string[];
}

export type DeviceImportMethod = "picker" | "vcf" | "native";

/** The most the gateway imports in one go (MAX_CONTACTS_PER_IMPORT). */
export const MAX_DEVICE_CONTACTS = 5000;

/**
 * The country part of the browser locale ("de-AT" → "AT"), so the gateway
 * reads national numbers ("0664 …") in the right country. Nothing when the
 * locale names no country — the gateway then uses its default.
 */
export function phoneRegionHint(): string | undefined {
  const lang = typeof navigator !== "undefined" ? navigator.language || "" : "";
  const part = lang.split(/[-_]/)[1];
  return part && /^[A-Za-z]{2}$/.test(part) ? part.toUpperCase() : undefined;
}

export async function importDeviceContacts(
  contacts: DeviceContact[],
  method: DeviceImportMethod,
): Promise<Record<string, unknown>> {
  const json = await call("/android-contacts/import", {
    method: "POST",
    body: JSON.stringify({ contacts: contacts.slice(0, MAX_DEVICE_CONTACTS), method, region: phoneRegionHint() }),
  });
  return json.result ?? {};
}

export async function importAndroidContacts(picked: PickedContact[]): Promise<Record<string, unknown>> {
  const contacts = picked.map((c) => ({ name: c.name?.[0] ?? "", emails: c.email ?? [], phones: c.tel ?? [] }));
  return importDeviceContacts(contacts, "picker");
}

/** VTID-05058: remove every contact imported from this member's phone. */
export async function removeDeviceContacts(): Promise<void> {
  await call("/android-contacts", { method: "DELETE" });
}

/** Whether this browser can open the phone's address book. */
export function contactPickerSupported(): boolean {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

export async function pickDeviceContacts(): Promise<PickedContact[]> {
  // @ts-expect-error — Contact Picker API is not in the TS DOM lib yet.
  return (await navigator.contacts.select(["name", "email", "tel"], { multiple: true })) ?? [];
}

/**
 * VTID-05058: a native app shell (the planned Maxina native app) can expose
 * the whole address book behind one OS permission prompt as
 * `window.vitanaNative.contacts.getAll()`. Absent in browsers and in the
 * current WebView shell, so this is false there.
 */
interface NativeContactsBridge {
  getAll: () => Promise<Array<{ name?: string; emails?: string[]; phones?: string[] }>>;
}
function nativeBridge(): NativeContactsBridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as unknown as { vitanaNative?: { contacts?: NativeContactsBridge } }).vitanaNative?.contacts;
  return b && typeof b.getAll === "function" ? b : null;
}

export function nativeContactsSupported(): boolean {
  return nativeBridge() !== null;
}

export async function readNativeContacts(): Promise<DeviceContact[]> {
  const b = nativeBridge();
  if (!b) throw new Error("native_contacts_unavailable");
  const all = (await b.getAll()) ?? [];
  return all.map((c) => ({
    name: String(c.name ?? ""),
    emails: Array.isArray(c.emails) ? c.emails.map(String) : [],
    phones: Array.isArray(c.phones) ? c.phones.map(String) : [],
  }));
}

/** Display order on the screen. */
export const APP_ORDER: Record<AppKind, ConnectedAppId[]> = {
  mail: ["gmail", "outlook-mail", "apple-mail"],
  calendar: ["google-calendar", "outlook-calendar", "apple-calendar"],
  contacts: ["google-contacts", "outlook-contacts", "iphone-contacts", "android-contacts"],
};

/** The OAuth callback lands on …/settings/connected-apps?app=<id>&connected=<provider>. */
export function readGrantReturn(search: string): { app: ConnectedAppId | null; error: string | null; provider: string | null } {
  const p = new URLSearchParams(search);
  const app = p.get("app");
  const all = Object.values(APP_ORDER).flat();
  return {
    app: app && (all as string[]).includes(app) ? (app as ConnectedAppId) : null,
    error: p.get("error"),
    provider: p.get("provider"),
  };
}
