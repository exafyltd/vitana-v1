/**
 * Batch 1.B1: Admin API client
 *
 * Thin wrapper around fetch that:
 *  1. Builds URLs relative to VITE_GATEWAY_URL (works with dev proxy)
 *  2. Injects Authorization header from the current Supabase session
 *  3. Injects X-Vitana-Tenant when the active tenant is known: `ctx.tenantId`
 *     if the caller passes one, else the session's `app_metadata.active_tenant_id`
 *     (the same claim useTenant reads). Absent when neither is known.
 *  4. Injects X-Vitana-Active-Role only when the caller passes `ctx.role`
 *     (the active role lives in React state via useRole, so a plain function
 *     cannot know it on its own). Absent otherwise.
 *
 * Headers in `init.headers` still win over the injected ones. The tenant/role
 * headers are client-side context only (VTID-05241): no gateway route that
 * adminFetch calls reads them yet.
 *
 * Usage:
 *   const data = await adminFetch('/admin/users?limit=50');
 *   const result = await adminFetch('/admin/tenants/abc/invitations', { method: 'POST', body: JSON.stringify({...}) });
 *   const scoped = await adminFetch('/admin/users', {}, { role: 'admin' });
 */

import { supabase } from "@/integrations/supabase/client";

const RAW_GATEWAY =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) || "";
// Strip trailing /api/v1 if present (vitana-v1's .env includes it)
const GATEWAY_BASE = RAW_GATEWAY.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export interface AdminFetchContext {
  /** Active tenant id; overrides the session claim when set. */
  tenantId?: string | null;
  /** Active role (from useRole); the role header is sent only when set. */
  role?: string | null;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function adminFetch(
  path: string,
  init: RequestInit = {},
  ctx: AdminFetchContext = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pre-existing untyped return; callers type the payload
): Promise<any> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("NO_AUTH_TOKEN");
  }

  const url = `${GATEWAY_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const appMetadata = session.user?.app_metadata as Record<string, unknown> | undefined;
  const tenantId = nonEmpty(ctx.tenantId) ?? nonEmpty(appMetadata?.active_tenant_id);
  const role = nonEmpty(ctx.role);

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(tenantId ? { "X-Vitana-Tenant": tenantId } : {}),
      ...(role ? { "X-Vitana-Active-Role": role } : {}),
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
