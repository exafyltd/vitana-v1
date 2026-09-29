import { GATEWAY_BASE } from "@/lib/gateway-base";
import { getAccessToken } from "@/lib/cached-access-token";

// VTID-04335: the old fallback was the deleted GCP Cloud Run gateway.
export const COMMUNITY_GATEWAY = GATEWAY_BASE;

export async function communityFetch(path: string, options?: RequestInit): Promise<Response> {
  // VTID-04536: the in-memory token (see cached-access-token.ts), not
  // getSession(), which waits on the auth lock when a screen opens.
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Vitana-Active-Role": "community",
  };

  if (options?.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  return fetch(COMMUNITY_GATEWAY + path, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });
}
