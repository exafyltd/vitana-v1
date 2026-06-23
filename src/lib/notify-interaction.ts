import { supabase } from '@/integrations/supabase/client';

/**
 * Fire-and-forget: tell the gateway that the current user just liked or
 * commented on a community post, so the post's author gets an in-app + push
 * notification (Instagram/Facebook style).
 *
 * The like/comment row is already written client-side (RLS-guarded) by the
 * interaction hooks; this only triggers the author notification. The gateway
 * verifies the interaction row exists for the caller (anti-spoof), skips
 * self-interactions, dedups repeat likes, and localizes via the author's
 * locale — so this client side stays dumb on purpose.
 *
 * Never throws and never blocks the UI: a failed notification must not surface
 * to the person who liked/commented (their action already succeeded).
 */
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_BASE || '';

export type InteractionSource = 'post' | 'media';
export type InteractionKind = 'like' | 'comment';

export async function notifyInteraction(input: {
  source: InteractionSource;
  targetId: string;
  kind: InteractionKind;
}): Promise<void> {
  try {
    if (!GATEWAY_URL) return;
    const { data } = await supabase.auth.getSession();
    const jwt = data?.session?.access_token;
    if (!jwt) return;

    await fetch(`${GATEWAY_URL}/api/v1/community/interactions/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        source: input.source,
        target_id: input.targetId,
        kind: input.kind,
      }),
      keepalive: true,
    });
  } catch {
    // swallow — notifications are best-effort, never block the liker
  }
}
