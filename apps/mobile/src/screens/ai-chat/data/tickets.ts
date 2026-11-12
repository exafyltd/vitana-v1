/**
 * VTID-05522 (native-wave2-ai-pages-r2/ai-chat) — the Talk-to-Vitana submit,
 * native twin of `handleSubmit` in `src/pages/community/TalkToVitana.tsx`. The
 * web posts through `communityFetch` (`@/lib/community-gateway`, class B), so
 * the request is re-implemented on the native gateway fetch (it prepends
 * `/api/v1` and adds the member's bearer token) with the same community role
 * header, body and reply handling:
 *
 *   POST /api/v1/feedback/tickets  { raw_text, kind, screen_path, app_version? }
 *
 * A non-2xx reply throws; the reply's `id` + `ticket_number` (when both are
 * present) become the success notice. The member ticket list below the form
 * reads the shared `MY_TICKETS_QUERY_KEY` query (support lane data layer).
 */
import Constants from 'expo-constants';
import { getGateway } from '../../../auth/gateway';
import { gatewayJson } from '../../../ports/core';
import type { TicketKind } from '../../../ports/ai-chat';

/** Web `TICKET_KINDS` (`src/lib/feedback-ticket.ts`), in the web's order. */
export const TICKET_KINDS: readonly TicketKind[] = ['feedback', 'bug', 'ux_issue', 'support_question', 'account_issue', 'marketplace_claim', 'feature_request'];

/** Web `maxLength={10_000}` on the textarea. */
export const TALK_MAX_LENGTH = 10_000;

/** The route this screen lives on: the web sends `window.location.pathname`. */
export const TALK_SCREEN_PATH = '/comm/talk-to-vitana';

export type TalkTicketBody = { raw_text: string; kind: TicketKind; screen_path: string; app_version?: string };

/** The web payload: trimmed text, the topic, the screen path and the app version when known. */
export function buildTalkTicketBody(text: string, kind: TicketKind, appVersion: string | null | undefined = Constants.expoConfig?.version): TalkTicketBody {
  const body: TalkTicketBody = { raw_text: text.trim(), kind, screen_path: TALK_SCREEN_PATH };
  if (appVersion) body.app_version = appVersion;
  return body;
}

export type CreatedTalkTicket = { id: string; ticket_number: string } | null;

export async function submitTalkTicket(body: TalkTicketBody): Promise<CreatedTalkTicket> {
  const created = await gatewayJson<{ id?: string; ticket_number?: string } | null>(getGateway(), '/feedback/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Vitana-Active-Role': 'community' },
    body: JSON.stringify(body),
  });
  return created?.id && created.ticket_number ? { id: created.id, ticket_number: created.ticket_number } : null;
}
