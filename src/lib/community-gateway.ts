import { supabase } from "@/integrations/supabase/client";

export const COMMUNITY_GATEWAY = "https://gateway-86804897789.us-central1.run.app";

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
