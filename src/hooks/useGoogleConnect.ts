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
 * VTID-01939: Invoke any capability through the connector framework.
 * Returns the DispatchResult shape: { ok, url?, external_id?, raw?, ... }.
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
