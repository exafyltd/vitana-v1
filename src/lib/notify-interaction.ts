import { supabase } from '@/integrations/supabase/client';

/**
 * Tell the gateway that the current user liked or commented on a community post
 * so the post's author gets an in-app + push notification (Instagram/Facebook
 * style). Mirrors the proven chat client (src/hooks/useChatApi.ts) exactly:
 * same gateway base (VITE_GATEWAY_URL, already includes /api/v1, with a hardcoded
 * prod fallback so it NEVER no-ops), same Bearer-token resolution with a single
 * refresh retry, and an awaited fetch.
 *
 * Best-effort: it logs failures but never throws into the caller — the
 * like/comment itself already succeeded.
 */

// Same as useChatApi.ts: VITE_GATEWAY_URL includes "/api/v1"; fall back to the
// prod gateway so a build without the env var still reaches a real gateway.
const GATEWAY_BASE =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  'https://gateway.vitanaland.com/api/v1';

export type InteractionSource = 'post' | 'media';
export type InteractionKind = 'like' | 'comment';

async function getAuthHeaders(): Promise<Record<string, string>> {
  let { data } = await supabase.auth.getSession();
  let token = data?.session?.access_token;
  if (!token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    token = refreshed?.session?.access_token;
  }
  if (!token) return { 'Content-Type': 'application/json' };
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function notifyInteraction(input: {
  source: InteractionSource;
  targetId: string;
  kind: InteractionKind;
}): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${GATEWAY_BASE}/community/interactions/notify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: input.source,
        target_id: input.targetId,
        kind: input.kind,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[notifyInteraction] gateway ${res.status}: ${body.slice(0, 300)}`);
    }
  } catch (err) {
    // Best-effort — never block or throw into the liker's flow.
    console.warn('[notifyInteraction] failed:', err);
  }
}
