/**
 * VTID-02919 (B0d.4-frontend-wake-timeline): ORB wake reliability
 * timeline client.
 *
 * Small fire-and-forget POST helper that sends a single wake-timeline
 * event to the gateway. Used for the frontend-side events the backend
 * can't know on its own:
 *
 *   - `wake_clicked`            user tapped ORB (captured at the gesture)
 *   - `client_context_received` envelope built on the FE
 *   - `ws_opened`               SSE / WS handshake completed on the FE
 *   - `first_audio_output`      first audio frame rendered to speakers
 *
 * The gateway's ingest endpoint is `POST /api/v1/voice/wake-timeline/event`
 * (VTID-02919). It validates names against WAKE_TIMELINE_EVENT_NAMES
 * and is best-effort — recorder failures return 200 ok:true
 * recorded:false; the frontend MUST treat all responses as success.
 *
 * Per the user's locked spec: B0d.3/4 are emit-and-render only.
 * NO timeout tuning, NO reconnect-backoff changes, NO greeting-latency
 * thresholds. The point is to MAKE the failure visible before the next
 * "fix" hides it under a nicer first sentence.
 */

export type WakeTimelineEventName =
  | 'wake_clicked'
  | 'client_context_received'
  | 'ws_opened'
  | 'session_start_received'
  | 'session_context_built'
  | 'continuation_decision_started'
  | 'continuation_decision_finished'
  | 'wake_brief_selected'
  | 'upstream_live_connect_started'
  | 'upstream_live_connected'
  | 'first_model_output'
  | 'first_audio_output'
  | 'disconnect'
  | 'reconnect_attempt'
  | 'reconnect_success'
  | 'manual_restart_required';

export interface PostWakeTimelineEventArgs {
  sessionId: string;
  name: WakeTimelineEventName;
  /** ISO 8601 — captured at the moment the event happened on the FE. */
  at?: string;
  /** Optional small payload. Gateway will accept plain objects only. */
  metadata?: Record<string, unknown>;
  /** Resolved gateway origin (e.g. `https://gateway.vitanaland.com`). */
  gatewayUrl: string;
}

/**
 * Send a single timeline event. Fire-and-forget by design:
 *   - Never throws.
 *   - Never blocks the wake path.
 *   - Failures are logged at warn level once per call; the gateway is
 *     considered ground truth and the FE never retries.
 */
export function postWakeTimelineEvent(args: PostWakeTimelineEventArgs): void {
  if (!args.sessionId || !args.name) return;
  const url = `${args.gatewayUrl}/api/v1/voice/wake-timeline/event`;
  const body: Record<string, unknown> = {
    sessionId: args.sessionId,
    name: args.name,
  };
  if (args.at) body.at = args.at;
  if (args.metadata && typeof args.metadata === 'object') body.metadata = args.metadata;

  // navigator.sendBeacon is the ideal transport (survives page unload,
  // doesn't block the renderer). Fall back to fetch for environments
  // that don't support it (e.g. React Native WebView).
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {
    // ignore — fall through to fetch
  }

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.warn(`[wakeTimelineClient] POST ${args.name} failed:`, e);
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[wakeTimelineClient] POST ${args.name} threw:`, e);
  }
}

/**
 * Build an ISO 8601 timestamp for "now". Exported so callers can capture
 * the moment of the user gesture synchronously, then POST asynchronously
 * once a sessionId is available.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Pending-wake-click stash.
//
// `wake_clicked` is captured INSIDE the user-gesture call stack (before
// any await), but the sessionId isn't known until /live/session/start
// returns 200–500ms later. We stash the captured ISO timestamp here so
// OrbVoiceClient can replay it onto the recorder the moment the session
// id arrives. The `at` field in the POST is the original tap moment —
// time_to_first_audio_ms stays accurate.
//
// Module-level state is acceptable here because the orb is single-
// instance per page; if a second tap arrives while the first is still
// in flight, the existing OrbVoiceClient's SESSION GUARD short-circuits
// before we overwrite this value.
// ---------------------------------------------------------------------------

let __pendingWakeClickedAt: string | null = null;

/**
 * Call this synchronously inside the user-gesture handler. Cheap (just
 * captures Date.now() as ISO).
 */
export function captureWakeClickedAt(): void {
  __pendingWakeClickedAt = nowIso();
}

/**
 * Consume and clear the pending timestamp. OrbVoiceClient calls this
 * after /live/session/start returns with a sessionId.
 */
export function takePendingWakeClickedAt(): string | null {
  const at = __pendingWakeClickedAt;
  __pendingWakeClickedAt = null;
  return at;
}
