/**
 * VTID-05032 (Health Hub D3): the member's real wearable connection state, read from the
 * gateway (GET /api/v1/wearables/providers), so Connected Apps never shows a
 * health integration as connected unless it is.
 *
 * Read-only (GET only). On any non-OK or failed call it logs a warning and
 * returns an empty list, so nothing shows as connected.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/locale-format";

// VITE_GATEWAY_URL in this repo already includes "/api/v1"; VITE_GATEWAY_BASE is bare origin.
const GATEWAY_BASE = (
  import.meta.env.VITE_GATEWAY_BASE ||
  (import.meta.env.VITE_GATEWAY_URL || "").replace(/\/api\/v1\/?$/, "") ||
  ""
).replace(/\/+$/, "");

export interface WearableProvider {
  id: string;
  display_name: string;
  category: string;
  status: "connected" | "available";
  last_sync_at: string | null;
}

export async function fetchWearableProviders(): Promise<WearableProvider[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${GATEWAY_BASE}/api/v1/wearables/providers`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    console.warn(`[wearables] GET /api/v1/wearables/providers failed: HTTP ${res.status}`);
    return [];
  }
  const body = (await res.json()) as { ok?: boolean; providers?: WearableProvider[] };
  if (!body.ok || !Array.isArray(body.providers)) {
    console.warn('[wearables] GET /api/v1/wearables/providers returned no provider list');
    return [];
  }
  return body.providers;
}

export function useWearableProviders() {
  return useQuery({
    queryKey: ["wearable-providers"],
    queryFn: () =>
      fetchWearableProviders().catch((err: unknown) => {
        console.warn('[wearables] GET /api/v1/wearables/providers failed', err);
        return [] as WearableProvider[];
      }),
    staleTime: 60_000,
  });
}

/** The provider for an app id, only when the gateway reports it connected. */
export function connectedProvider(
  providers: WearableProvider[] | undefined,
  appId: string,
): WearableProvider | null {
  const p = (providers ?? []).find((x) => x.id === appId);
  return p && p.status === "connected" ? p : null;
}

/**
 * VTID-05032 (Health Hub D3): merge the gateway's real connection state into a
 * static catalog list (mobile Connected Apps, ConnectAppPopup). Every entry is
 * connected only when the gateway reports that provider connected; its last
 * sync is the real `last_sync_at`, formatted for the member's locale.
 */
export function mergeWearableState<T extends { id: string; connected: boolean; lastSync?: string }>(
  integrations: T[],
  providers: WearableProvider[] | undefined,
): T[] {
  return integrations.map((integration) => {
    const p = connectedProvider(providers, integration.id);
    return {
      ...integration,
      connected: !!p,
      lastSync: p?.last_sync_at ? fmtDateTime(new Date(p.last_sync_at)) : undefined,
    };
  });
}
