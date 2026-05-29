import { supabase } from "@/integrations/supabase/client";

export const COMMUNITY_GATEWAY = (
  import.meta.env.VITE_GATEWAY_BASE || "https://gateway-q74ibpv6ia-uc.a.run.app"
).replace(/\/+$/, "");

export async function communityFetch(path: string, options?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
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
