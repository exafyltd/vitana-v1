/**
 * VTID-01928: Google OAuth connector hook
 *
 * Initiates the backend-driven OAuth flow (GET /api/v1/social/connect/google),
 * then redirects the browser to Google's consent screen. After consent Google
 * sends the code back to the gateway callback, which stores tokens in
 * social_connections and redirects the browser to
 * /settings/connected-apps?connected=google.
 *
 * The same Google consent covers Gmail, Google Calendar, Google Contacts
 * (People API), YouTube and YouTube Music — one grant, five connectors light up.
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

// Connector IDs on the Connected Apps page that route through Google OAuth.
export const GOOGLE_CONNECTOR_IDS = new Set<string>([
  "gmail",
  "google-contacts",
  "google-calendar",
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
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social/connections`, { headers });
      if (!resp.ok) return [];
      const json = await resp.json();
      return json.connections ?? [];
    },
    staleTime: 30_000,
  });
}

/**
 * Kick off the Google OAuth flow. On success, the page navigates away to
 * Google's consent screen, so the mutation never resolves in the normal sense.
 */
export function useStartGoogleConnect() {
  return useMutation({
    mutationFn: async () => {
      const headers = await authHeaders();
      const resp = await fetch(`${GATEWAY_BASE}/api/v1/social/connect/google`, {
        method: "GET",
        headers,
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to start Google OAuth (${resp.status}): ${text}`);
      }
      const json = await resp.json();
      if (!json.auth_url) {
        throw new Error("Gateway did not return an auth_url");
      }
      // Hand off to Google — full page redirect so we preserve browser history.
      window.location.href = json.auth_url;
      return json.auth_url as string;
    },
  });
}
