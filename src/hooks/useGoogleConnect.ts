/**
 * VTID-01928: Google OAuth connector hook
 *
 * Initiates the backend-driven OAuth flow (GET /api/v1/social-accounts/connect/google),
 * then redirects the browser to Google's consent screen. After consent Google
 * sends the code back to the gateway callback, which stores tokens in
 * social_connections and redirects the browser to
 * /settings/connected-apps?connected=google.
 *
 * The Google consent covers Gmail, Google Calendar and Google Contacts
 * (People API). YouTube and YouTube Music go through a dedicated youtube
 * provider (useStartYouTubeConnect) so users aren't asked to grant mail and
 * calendar scopes just to connect their YouTube account.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAppilixWebView, redirectViaSystemBrowser } from "@/lib/webview";

const GATEWAY_BASE = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "") ||
  "https://gateway-q74ibpv6ia-uc.a.run.app"
).replace(/\/+$/, "");

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class SocialConnectionsFetchError extends Error {
  constructor(public status: number, public body: string) {
    super(status === 401 ? "SESSION_EXPIRED" : `CONNECTIONS_FETCH_FAILED_${status}`);
    this.name = "SocialConnectionsFetchError";
  }
}

// Connector IDs on the Connected Apps page that route through Google OAuth
// (Mail, Calendar, Contacts — scopes bundled into one consent).
export const GOOGLE_CONNECTOR_IDS = new Set<string>([
  "gmail",
  "google-contacts",
  "google-calendar",
]);

// Connector IDs that route through the dedicated YouTube OAuth. Same Google
// OAuth app underneath, but only youtube.readonly is requested — so the user
// gets a YouTube-scoped consent screen instead of the full Google bundle.
export const YOUTUBE_CONNECTOR_IDS = new Set<string>([
  "youtube-music",
  "youtube-playback",
]);

export interface SocialConnection {
  provider: string;
  username: string;
  display_name: string;
  avatar_url: string;
  profile_url: string;
  enrichment_status: string;
  connected_at: string;
}

/**
 * Fetch the user's active social connections. Used to derive "Connected"
 * state for Google-backed connectors on the Connected Apps page.
 *
 * Throws `SocialConnectionsFetchError` on non-2xx responses (previously
 * swallowed into an empty array, which made expired JWTs look like
 * "no connections"). Consumers should render a session-expired banner
 * when `error.status === 401`.
 */
export function useSocialConnections() {
  return useQuery<SocialConnection[], SocialConnectionsFetchError>({
    queryKey: ["social-connections"],
    queryFn: async () => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social-accounts/connections`, { headers });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new SocialConnectionsFetchError(resp.status, body);
      }
      const json = await resp.json();
      return json.connections ?? [];
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      // Don't retry auth errors; the banner prompts the user to re-sign in.
      if (error instanceof SocialConnectionsFetchError && error.status === 401) return false;
      return failureCount < 2;
    },
  });
}

export interface GoogleVerifyResult {
  ok: boolean;
  connection?: {
    email: string;
    connected_at: string;
    token_expires_at: string;
    scopes: string[];
    has_refresh_token: boolean;
  };
  probes?: {
    gmail: { ok: boolean; email?: string; messages_total?: number; threads_total?: number; status?: number; error?: string };
    calendar: { ok: boolean; calendars?: number; primary?: string | null; status?: number; error?: string };
    contacts: { ok: boolean; total_people?: number | null; status?: number; error?: string };
  };
  error?: string;
}

/**
 * Phase 4: thrown by `useInvokeCapability` when a capability fails because
 * the stored token is missing one or more scopes. Carries the reconnect
 * URL the UI uses for a one-tap "Grant access" prompt that re-runs the
 * Google OAuth flow with `mode=incremental` so Google only asks for the
 * missing scopes (and merges them onto the existing grant).
 */
export class InsufficientScopeError extends Error {
  constructor(
    public capability: string,
    public neededScopes: string[],
    public reconnectPath: string,
    public friendlyMessage: string,
  ) {
    super(friendlyMessage);
    this.name = "InsufficientScopeError";
  }
}

/**
 * VTID-01939: Invoke any capability through the connector framework.
 * Returns the DispatchResult shape: { ok, url?, external_id?, raw?, ... }.
 *
 * Phase 4: when the dispatcher returns `error: 'insufficient_scope'` we
 * throw an `InsufficientScopeError` instead of a plain Error so the
 * caller can render a "Grant access" action.
 */
export function useInvokeCapability() {
  return useMutation({
    mutationFn: async (opts: { capability: string; args?: Record<string, unknown> }) => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/capabilities/${opts.capability}`, {
        method: "POST",
        headers,
        body: JSON.stringify(opts.args ?? {}),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json?.ok === false) {
        if (json?.error === "insufficient_scope" && json?.raw?.reconnect_url) {
          throw new InsufficientScopeError(
            String(json.raw.capability ?? opts.capability),
            Array.isArray(json.raw.needed_scopes) ? json.raw.needed_scopes : [],
            String(json.raw.reconnect_url),
            String(json.raw.message ?? "Vitana needs an additional Google permission for this action."),
          );
        }
        throw new Error(json?.error ?? `Capability failed (${resp.status})`);
      }
      return json as {
        ok: boolean;
        url?: string;
        external_id?: string;
        connector?: string;
        capability?: string;
        token_refreshed?: boolean;
        raw?: Record<string, unknown>;
      };
    },
  });
}

/**
 * Phase 4: helper to re-launch the Google connect flow asking for the
 * missing scopes. Always uses `mode=incremental` so Google merges the
 * new scopes onto the user's existing token row instead of forcing a
 * full re-consent. The `reconnectPath` comes straight from the gateway's
 * insufficient_scope response (already includes `?include=…&mode=…`).
 */
export async function launchIncrementalConsent(reconnectPath: string): Promise<void> {
  const headers = await authHeaders();
  const sep = reconnectPath.includes("?") ? "&" : "?";
  const url = `${GATEWAY_BASE}${reconnectPath}${isAppilixWebView() ? `${sep}return=mobile` : ""}`;
  const resp = await fetch(url, { method: "GET", headers });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to start incremental consent (${resp.status}): ${text}`);
  }
  const json = await resp.json();
  if (!json.auth_url) {
    throw new Error("Gateway did not return an auth_url for incremental consent");
  }
  redirectViaSystemBrowser(json.auth_url);
}

/**
 * Phase 4: surface an `InsufficientScopeError` as a sonner toast with a
 * "Grant access" action that launches incremental consent. Callers can
 * use this from any capability error handler instead of writing the
 * boilerplate themselves.
 *
 *   try { await invokeCapability.mutateAsync(...) }
 *   catch (err) { if (!handleInsufficientScope(err)) toast.error(err.message) }
 */
export function handleInsufficientScope(err: unknown): boolean {
  if (!(err instanceof InsufficientScopeError)) return false;
  toast.error(err.friendlyMessage, {
    duration: 12_000,
    action: {
      label: "Grant access",
      onClick: () => {
        launchIncrementalConsent(err.reconnectPath).catch((reconnectErr) => {
          const message =
            reconnectErr instanceof Error ? reconnectErr.message : String(reconnectErr);
          toast.error(`Couldn't open Google consent: ${message}`);
        });
      },
    },
  });
  return true;
}

/**
 * Functional verification: hits the stored token against Gmail / Calendar /
 * Contacts / YouTube and returns a per-service probe result. Used by the
 * Manage button on the Connected Apps page.
 */
export function useVerifyGoogleConnection(enabled = false) {
  return useQuery<GoogleVerifyResult>({
    queryKey: ["social-accounts", "google", "verify"],
    queryFn: async () => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social-accounts/google/verify`, { headers });
      if (!resp.ok) {
        const text = await resp.text().catch(() => resp.statusText);
        throw new Error(`Verify failed (${resp.status}): ${text}`);
      }
      return resp.json();
    },
    enabled,
    staleTime: 10_000,
    retry: false,
  });
}

/**
 * Kick off the Google OAuth flow. On success, the page navigates away to
 * Google's consent screen, so the mutation never resolves in the normal sense.
 */
export function useStartGoogleConnect() {
  return useStartSocialOAuth("google");
}

/**
 * Kick off the dedicated YouTube OAuth flow. Shares Google's OAuth server but
 * requests only youtube.readonly, so users connecting YouTube don't get a
 * consent screen asking for Gmail, Calendar and Contacts.
 */
export function useStartYouTubeConnect() {
  return useStartSocialOAuth("youtube");
}

export type GoogleSubService = "gmail" | "calendar" | "contacts" | "youtube";

export const ALL_GOOGLE_SUB_SERVICES: GoogleSubService[] = ["gmail", "calendar", "contacts", "youtube"];

/**
 * Phase 3 (unified Google connect): one Connect button covering any
 * combination of Gmail / Calendar / Contacts / YouTube under a single
 * consent screen. Backend builds the scopes from `?include=...`.
 */
export function useStartUnifiedGoogleConnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts: {
      include: GoogleSubService[];
      mode?: "full" | "incremental";
    }) => {
      if (!opts.include || opts.include.length === 0) {
        throw new Error("Pick at least one Google service to connect.");
      }
      const headers = await authHeaders();
      const params = new URLSearchParams({ include: opts.include.join(",") });
      if (opts.mode === "incremental") params.set("mode", "incremental");
      if (isAppilixWebView()) params.set("return", "mobile");
      const resp = await fetch(
        `${GATEWAY_BASE}/api/v1/social-accounts/connect/google?${params.toString()}`,
        { method: "GET", headers },
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to start Google OAuth (${resp.status}): ${text}`);
      }
      const json = await resp.json();
      if (!json.auth_url) {
        throw new Error("Gateway did not return an auth_url");
      }
      if (isAppilixWebView()) {
        startConnectionsPoller(queryClient, "google");
      }
      redirectViaSystemBrowser(json.auth_url);
      return json.auth_url as string;
    },
  });
}

/**
 * When running in the Appilix WebView, OAuth completes in the system browser
 * (Chrome). The WebView never gets a callback or postMessage from the
 * browser, so after kicking off the flow we poll `/connections` every 3s for
 * 2 minutes. As soon as the expected provider row appears, react-query
 * invalidates and the UI flips to "Connected" without the user doing
 * anything beyond swiping back to the app.
 */
function startConnectionsPoller(
  queryClient: ReturnType<typeof useQueryClient>,
  provider: string,
): void {
  const startedAt = Date.now();
  const intervalId = window.setInterval(async () => {
    if (Date.now() - startedAt > 120_000) {
      window.clearInterval(intervalId);
      return;
    }
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;
      const r = await fetch(`${GATEWAY_BASE}/api/v1/social-accounts/connections`, {
        headers: { Authorization: `Bearer ${session.session.access_token}` },
      });
      if (!r.ok) return;
      const json = await r.json();
      const match = (json.connections ?? []).some(
        (c: SocialConnection & { is_active?: boolean }) =>
          c.provider === provider && c.is_active !== false,
      );
      if (match) {
        queryClient.invalidateQueries({ queryKey: ["social-connections"] });
        queryClient.invalidateQueries({ queryKey: ["social-accounts", "google", "verify"] });
        window.clearInterval(intervalId);
      }
    } catch {
      // Network blips are fine; try again next tick.
    }
  }, 3000);
}

function useStartSocialOAuth(provider: "google" | "youtube") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social-accounts/connect/${provider}`, {
        method: "GET",
        headers,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to start ${provider} OAuth (${resp.status}): ${text}`);
      }
      const json = await resp.json();
      if (!json.auth_url) {
        throw new Error("Gateway did not return an auth_url");
      }
      if (isAppilixWebView()) {
        startConnectionsPoller(queryClient, provider);
      }
      redirectViaSystemBrowser(json.auth_url);
      return json.auth_url as string;
    },
  });
}
