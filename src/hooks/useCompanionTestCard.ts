/**
 * VTID-05589 (companion-test-card/v1-test-card-button) — an exafy admin sends
 * one Vitana companion card (the Vitana Index card) to themselves:
 *
 *   POST /api/v1/companion/test-card  { moment_key: 'vitana_index' }
 *     → 200 { ok, chat_message_id, moment_key, card_type, text }
 *     → 409 STAGING_DISABLED | SEND_NOT_AVAILABLE, 422 NO_VITANA_INDEX,
 *       429 RATE_LIMITED, 401/403/5xx otherwise   (gateway VTID-05588)
 *
 * The gateway always sends to the signed-in caller; the body never names a
 * user. `sendCompanionTestCard` never throws: a network error is a failed
 * result, so the settings row can always show a message.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GATEWAY_API_URL } from '@/lib/gateway-base';

export const COMPANION_TEST_CARD_PATH = '/companion/test-card';

export type CompanionTestCardResult =
  | { ok: true; chat_message_id: string | null; moment_key: string; card_type: string | null; text: string }
  | { ok: false; status: number; error: string };

const I18N = 'screens.settings.vitanaMessages.testCard';

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function sendCompanionTestCard(): Promise<CompanionTestCardResult> {
  try {
    const res = await fetch(`${GATEWAY_API_URL}${COMPANION_TEST_CARD_PATH}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ moment_key: 'vitana_index' }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && body.ok === true) {
      return {
        ok: true,
        chat_message_id: typeof body.chat_message_id === 'string' ? body.chat_message_id : null,
        moment_key: String(body.moment_key ?? 'vitana_index'),
        card_type: typeof body.card_type === 'string' ? body.card_type : null,
        text: String(body.text ?? ''),
      };
    }
    return { ok: false, status: res.status, error: typeof body.error === 'string' ? body.error : `HTTP_${res.status}` };
  } catch {
    return { ok: false, status: 0, error: 'NETWORK' };
  }
}

/** The i18n key of the message for a failed result. */
export function testCardErrorKey(result: CompanionTestCardResult): string {
  const error = 'error' in result ? result.error : '';
  switch (error) {
    case 'STAGING_DISABLED':
    case 'SEND_NOT_AVAILABLE':
      return `${I18N}.unavailable`;
    case 'NO_VITANA_INDEX':
      return `${I18N}.noIndex`;
    case 'RATE_LIMITED':
      return `${I18N}.rateLimited`;
    default:
      return `${I18N}.failed`;
  }
}

export function useCompanionTestCard() {
  const mutation = useMutation({ mutationFn: sendCompanionTestCard });
  return {
    send: mutation.mutateAsync,
    isSending: mutation.isPending,
    lastResult: mutation.data ?? null,
  };
}
