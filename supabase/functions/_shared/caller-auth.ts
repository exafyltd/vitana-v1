/**
 * VTID-05049 (Track S / S4, S-H): who is calling this edge function?
 *
 * Several functions ran with the service-role client on a user id taken from
 * the request body. `verify_jwt=true` does not stop that: the public anon key
 * is a valid JWT, so anyone holding it could act on any member. Use these
 * helpers instead of trusting a body id:
 *
 * - `requireUser(req, cors)`: the signed-in member behind the bearer token
 *   (verified by GoTrue via auth.getUser()), or a ready 401 response.
 * - `isServiceRoleCaller(req)`: true only for a server-side caller holding
 *   the service-role key (another edge function's service client, or a
 *   pg_net trigger).
 */
import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createDataClient } from "./data-client.ts";

export function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

// Unverified read of a JWT payload. Only used to decide whether a token is
// worth verifying as a service-role key; never trusted on its own.
function unverifiedJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * True when the bearer token is the service-role key.
 *
 * 1. Exact (constant-time) match with this function's SUPABASE_SERVICE_ROLE_KEY.
 *    This covers other edge functions' service clients.
 * 2. Otherwise, a token that claims `role: service_role` (or is an
 *    `sb_secret_` key) is verified by Supabase Auth itself: first
 *    auth.getClaims(), then — because getClaims() verifies an HS256 token by
 *    calling /auth/v1/user, which rejects a token without a `sub` — an admin
 *    API read that only a valid service-role key can make. This covers a
 *    caller holding a different copy/format of the key (risk R1: the vault
 *    key a pg_net trigger sends may differ from the edge env key).
 */
export async function isServiceRoleCaller(req: Request): Promise<boolean> {
  const token = bearerToken(req);
  if (!token) return false;

  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (envKey && timingSafeEqual(token, envKey)) return true;

  const payload = unverifiedJwtPayload(token);
  const claimsServiceRole = payload?.role === "service_role";
  if (!claimsServiceRole && !token.startsWith("sb_secret_")) return false;

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url) return false;

  if (claimsServiceRole) {
    try {
      const anon = createDataClient(createClient, url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await anon.auth.getClaims(token);
      if (!error && data?.claims?.role === "service_role") return true;
    } catch {
      // fall through to the admin API check
    }
  }

  try {
    const asCaller = createDataClient(createClient, url, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await asCaller.auth.admin.listUsers({ page: 1, perPage: 1 });
    return !error;
  } catch {
    return false;
  }
}

export type RequireUserResult =
  | { user: User; response: null }
  | { user: null; response: Response };

/** The signed-in member behind the bearer token, or a 401 response. */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<RequireUserResult> {
  const unauthorized = (): RequireUserResult => ({ user: null, response: unauthorizedResponse(corsHeaders) });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !bearerToken(req)) return unauthorized();

  try {
    const client = createDataClient(
      createClient,
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user) return unauthorized();
    return { user: data.user, response: null };
  } catch {
    return unauthorized();
  }
}

export function forbidden(corsHeaders: Record<string, string>, message = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function unauthorizedResponse(corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
