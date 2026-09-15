/**
 * Storage bridge client — drop-in facade for edge functions that call
 * Supabase Storage's `.storage.*` client directly (Aurora migration B6,
 * VTID-03815 continuation).
 *
 * WHY THIS EXISTS
 *
 * `AURORA-B6-STORAGE-INVENTORY.md` (vitana-platform repo) found 5 edge
 * functions in this repo calling `.storage.from(bucket).upload/remove/
 * list/getPublicUrl/createSignedUrl(...)` directly against whichever
 * Supabase project this deployment's `SUPABASE_URL` resolves to — with no
 * seam equivalent to the gateway's own `STORAGE_PROVIDER` abstraction
 * (`services/gateway/src/services/storage/storage-provider.ts`, VTID-03765),
 * so an eventual S3 cutover would need editing 5 functions individually
 * with no single flip point.
 *
 * Same pattern as `bedrock-bridge-client.ts` (B7): rather than give every
 * edge function its own AWS SDK dependency and IAM-role credential (Deno
 * edge runtimes are not where `BEDROCK_ROLE_ARN`-style roles live), this
 * puts ONE storage call point on the gateway
 * (`services/gateway/src/routes/storage-bridge.ts`) and this client calls
 * it as a service instead.
 *
 * DEFAULT BEHAVIOR IS UNCHANGED
 *
 * Every function below is called ONLY when a consuming edge function opts
 * in via `STORAGE_BRIDGE_PROVIDER=bridge` (see `storageBridgeProvider()`
 * below) — the default, `supabase`, means the calling edge function keeps
 * using its own direct `.storage.*` calls untouched. This mirrors
 * `AI_BRIDGE_PROVIDER`'s "ship the seam, default unchanged" shape exactly.
 *
 * AUTH
 *
 * Same as `bedrock-bridge-client.ts`: calls the gateway as a SERVICE via
 * `GATEWAY_SERVICE_TOKEN` (must be set as a Supabase edge function secret
 * with the SAME value as the gateway's own `GATEWAY_SERVICE_TOKEN`), never
 * forwarding the calling user's own JWT.
 */

/**
 * Read via `globalThis` rather than the bare `Deno` identifier — same
 * reasoning as `bedrock-bridge-client.ts`'s `denoEnv()`: this file is also
 * imported by a Node/Vitest suite with no Deno ambient types.
 */
function denoEnv(key: string): string | undefined {
  return (globalThis as any).Deno?.env?.get(key);
}

function gatewayBaseUrl(): string {
  return denoEnv('GATEWAY_URL') || 'https://gateway.vitanaland.com/api/v1';
}

export type StorageBridgeProvider = 'supabase' | 'bridge';

/**
 * `STORAGE_BRIDGE_PROVIDER` is a per-function opt-in, not a global switch —
 * each of the 5 consuming functions reads its own env var independently
 * (mirroring `AI_BRIDGE_PROVIDER`'s per-function-secret shape), so they can
 * graduate to the bridge one at a time rather than all-or-nothing.
 */
export function storageBridgeProvider(): StorageBridgeProvider {
  const raw = (denoEnv('STORAGE_BRIDGE_PROVIDER') || 'supabase').trim().toLowerCase();
  return raw === 'bridge' ? 'bridge' : 'supabase';
}

function serviceToken(): string {
  const token = denoEnv('GATEWAY_SERVICE_TOKEN');
  if (!token) {
    throw new Error('GATEWAY_SERVICE_TOKEN not configured — cannot reach the storage bridge');
  }
  return token;
}

async function bridgeFetch(path: string, init: RequestInit): Promise<any> {
  const resp = await fetch(`${gatewayBaseUrl()}/storage-bridge${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken()}`,
      ...(init.headers || {}),
    },
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Storage bridge request failed: ${resp.status} ${body}`);
  }

  return resp.json();
}

/**
 * Base64-encodes `bytes` for the JSON bridge — callers with an
 * ArrayBuffer/Uint8Array (the common shape after `fetch().arrayBuffer()`
 * or an AI-generated image buffer) should pass it through this rather than
 * hand-rolling base64 differently per call site.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Mirrors Supabase Storage's `.storage.from(bucket).upload(path, bytes, opts)`. */
export async function uploadFile(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  opts: { contentType?: string; upsert?: boolean; cacheControl?: string } = {},
): Promise<void> {
  await bridgeFetch('/upload', {
    method: 'POST',
    body: JSON.stringify({
      bucket,
      path,
      contentBase64: bytesToBase64(bytes),
      contentType: opts.contentType,
      upsert: opts.upsert,
      cacheControl: opts.cacheControl,
    }),
  });
}

/** Mirrors Supabase Storage's `.storage.from(bucket).remove(paths)`. */
export async function removeFiles(bucket: string, paths: string[]): Promise<{ removed: number }> {
  return bridgeFetch('/remove', {
    method: 'POST',
    body: JSON.stringify({ bucket, paths }),
  });
}

/** Mirrors Supabase Storage's `.storage.from(bucket).getPublicUrl(path).data.publicUrl`. */
export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const result = await bridgeFetch(
    `/public-url?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
    { method: 'GET' },
  );
  return result.url;
}

/** Mirrors Supabase Storage's `.storage.from(bucket).list(prefix, {limit})`. */
export async function listFiles(
  bucket: string,
  prefix: string,
  opts: { limit?: number } = {},
): Promise<{ name: string }[]> {
  const result = await bridgeFetch('/list', {
    method: 'POST',
    body: JSON.stringify({ bucket, prefix, limit: opts.limit }),
  });
  return result.files;
}

/** Mirrors Supabase Storage's `.storage.from(bucket).createSignedUrl(path, expiresIn)`. */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const result = await bridgeFetch('/signed-url', {
    method: 'POST',
    body: JSON.stringify({ bucket, path, expiresInSeconds }),
  });
  return result.url;
}
