/**
 * VTID-05118: the shared-secret caller check for pg_net triggers.
 *
 * A database trigger cannot hold the service-role key (vault has none), so it
 * sends the vault `email_trigger_secret` as an `X-Trigger-Secret` header; the
 * edge function compares it with its `EMAIL_TRIGGER_SECRET` secret.
 *
 * This file has no imports on purpose: Vitest can import it
 * (src/lib/trigger-secret.test.ts), which it cannot do for caller-auth.ts
 * (URL import). Edge functions import it through `./caller-auth.ts`.
 */

type EnvGetter = (name: string) => string | undefined;

// Deno is reached through globalThis only when called, so the module loads
// under Node/Vitest too (same as data-client.ts).
const denoEnv: EnvGetter = (name) => {
  const deno = (globalThis as { Deno?: { env?: { get?: EnvGetter } } }).Deno;
  return deno?.env?.get?.(name);
};

export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

/**
 * True when the request carries `X-Trigger-Secret` equal (constant-time) to
 * the EMAIL_TRIGGER_SECRET edge secret. An unset or blank secret never
 * matches, so an empty header cannot pass.
 */
export function isTriggerSecretCaller(req: Request, getEnv: EnvGetter = denoEnv): boolean {
  const secret = getEnv("EMAIL_TRIGGER_SECRET") ?? "";
  if (!secret.trim()) return false;
  const provided = req.headers.get("x-trigger-secret");
  if (provided === null) return false;
  return timingSafeEqual(provided, secret);
}
