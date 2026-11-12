/**
 * VTID-05523 (native-wave2-ai-pages-r2/ai-coach) — the gateway calls of the
 * AI coach pages, re-implemented natively (plan decision 2: the web clients
 * import the community gateway / Supabase client, class B, never extracted):
 *
 *  - `fetchDailyLearnings` — web `src/lib/memory-api.ts:172-177`
 *    (`GET /api/v1/memory/daily-learning?limit=N`, `json()` error rule).
 *  - `sendCoachMessage` — web `src/lib/coach-chat-api.ts` (`POST
 *    /api/v1/conversation/turn`, the same body; the thread id is kept for the
 *    app session like the web's sessionStorage).
 *  - `completeAutopilotBySourceRef` — web `src/hooks/useAutopilotComplete.ts`
 *    (`GET /api/v1/autopilot/recommendations?role=community`, then `POST
 *    …/:id/complete?role=community`), once per source ref per session.
 *
 * Every request goes through `getGateway()` (N1's `createGatewayFetch`: the
 * Bearer token and the `/api/v1` prefix) plus what the web `communityFetch`
 * adds: `X-Vitana-Active-Role: community` and a JSON content type for a
 * string body.
 */
import { getGateway } from '../../../auth/gateway';

export const ACTIVE_ROLE_HEADER = 'X-Vitana-Active-Role';

/** Web `communityFetch` over the shell gateway (path relative to `/api/v1`). */
export function communityFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { [ACTIVE_ROLE_HEADER]: 'community' };
  if (typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  return getGateway()(path, { ...init, headers: { ...headers, ...((init.headers as Record<string, string> | undefined) ?? {}) } });
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const text = await res.text();
    return text ? ((JSON.parse(text) ?? {}) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ── daily learnings (memory-api.ts) ─────────────────────────────────────

export type DailyLearning = { id: string; date: string; content: string; created_at: string };

export const DAILY_LEARNINGS_KEY = ['daily-learnings'] as const;

/** What Vitana learned each day, newest first. A non-2xx answer or `{ ok: false }` throws. */
export async function fetchDailyLearnings(limit = 14): Promise<DailyLearning[]> {
  const res = await communityFetch(`/memory/daily-learning?limit=${limit}`);
  const body = await readJson(res);
  if (!res.ok || body.ok === false) throw new Error(typeof body.error === 'string' ? body.error : `HTTP ${res.status}`);
  return (body.learnings as DailyLearning[] | undefined) ?? [];
}

// ── the coach chat (coach-chat-api.ts) ──────────────────────────────────

export type CoachUser = { id: string; app_metadata?: Record<string, unknown> | null };

/** The thread id for this app session (web: sessionStorage `vitana.healthCoach.threadId`). */
let threadId: string | undefined;

export function __resetCoachThreadForTests(): void {
  threadId = undefined;
}

/** The `POST /conversation/turn` body (web coach-chat-api.ts:46-55). */
export function coachTurnBody(user: CoachUser, text: string, lang: string, thread?: string): Record<string, unknown> {
  const tenantId = user.app_metadata?.active_tenant_id;
  const body: Record<string, unknown> = {
    channel: 'orb',
    user_id: user.id,
    lang: lang.slice(0, 2),
    message: { type: 'text', text },
    ui_context: { surface: 'orb', screen: 'health_coach' },
  };
  if (typeof tenantId === 'string' && tenantId) body.tenant_id = tenantId;
  if (thread) body.thread_id = thread;
  return body;
}

/** Sends one coach turn; the reply is the gateway's text in the member's language. */
export async function sendCoachMessage(user: CoachUser | null, text: string, lang: string): Promise<{ reply: string; threadId?: string }> {
  if (!user) throw new Error('Not authenticated');
  const res = await communityFetch('/conversation/turn', { method: 'POST', body: JSON.stringify(coachTurnBody(user, text, lang, threadId)) });
  const json = await readJson(res);
  if (!res.ok || json.ok === false || typeof json.reply !== 'string') {
    throw new Error(typeof json.error === 'string' ? json.error : `HTTP ${res.status}`);
  }
  if (typeof json.thread_id === 'string' && json.thread_id) threadId = json.thread_id;
  return { reply: json.reply, threadId: typeof json.thread_id === 'string' ? json.thread_id : undefined };
}

// ── autopilot completion (useAutopilotComplete.ts) ──────────────────────

export type ContributionVector = Partial<Record<'nutrition' | 'hydration' | 'exercise' | 'sleep' | 'mental', number>>;
export type AutopilotCompletion = { title: string; reward: number | undefined; vector: ContributionVector | undefined };

const firedRefs = new Set<string>();

export function __resetAutopilotRefsForTests(): void {
  firedRefs.clear();
}

/**
 * Completes the member's open recommendation with `source_ref === sourceRef`
 * (once per session). Returns what was completed, or null when nothing was
 * (no match, already fired, a failed call — the web swallows those too).
 */
export async function completeAutopilotBySourceRef(sourceRef: string): Promise<AutopilotCompletion | null> {
  if (firedRefs.has(sourceRef)) return null;
  firedRefs.add(sourceRef);
  try {
    const res = await communityFetch('/autopilot/recommendations?role=community');
    if (!res.ok) return null;
    const { recommendations } = (await readJson(res)) as { recommendations?: Array<Record<string, unknown>> };
    const rec = recommendations?.find((r) => r.source_ref === sourceRef && r.status !== 'completed');
    if (!rec) return null;
    const done = await communityFetch(`/autopilot/recommendations/${String(rec.id)}/complete?role=community`, { method: 'POST' });
    if (!done.ok) return null;
    const { reward } = (await readJson(done)) as { reward?: unknown };
    return {
      title: typeof rec.title === 'string' ? rec.title : '',
      reward: typeof reward === 'number' ? reward : undefined,
      vector: (rec.contribution_vector as ContributionVector | undefined) ?? undefined,
    };
  } catch {
    return null;
  }
}
