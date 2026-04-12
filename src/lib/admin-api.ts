/**
 * Batch 1.B1: Admin API client
 *
 * Thin wrapper around fetch that:
 *  1. Builds URLs relative to VITE_GATEWAY_URL (works with dev proxy)
 *  2. Injects Authorization header from the current Supabase session
 *  3. Injects X-Vitana-Tenant and X-Vitana-Active-Role context headers
 *
 * Usage:
 *   const data = await adminFetch('/admin/users?limit=50');
 *   const result = await adminFetch('/admin/tenants/abc/invitations', { method: 'POST', body: JSON.stringify({...}) });
 */

import { supabase } from "@/integrations/supabase/client";

const RAW_GATEWAY =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
// Strip trailing /api/v1 if present (vitana-v1's .env includes it)
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export async function adminFetch(
  path: string,
  init: RequestInit = {}
): Promise<any> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("NO_AUTH_TOKEN");
  }

  const url = `${GATEWAY_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error || body?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}
