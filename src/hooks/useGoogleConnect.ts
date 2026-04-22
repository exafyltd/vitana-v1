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

import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
 */
export function useSocialConnections() {
  return useQuery<SocialConnection[]>({
    queryKey: ["social-connections"],
    queryFn: async () => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social-accounts/connections`, { headers });
      if (!resp.ok) return [];
      const json = await resp.json();
      return json.connections ?? [];
    },
    staleTime: 30_000,
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
    youtube: { ok: boolean; channel_title?: string | null; subscriber_count?: string | null; has_channel?: boolean; status?: number; error?: string };
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

function useStartSocialOAuth(provider: "google" | "youtube") {
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
      // Hand off to the provider — full page redirect so we preserve history.
      window.location.href = json.auth_url;
      return json.auth_url as string;
    },
  });
}
