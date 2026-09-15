/**
 * Fetch-based Server-Sent Events reader for the gateway's B5 realtime
 * relay routes (`GET /api/v1/realtime/*`, see
 * vitana-platform's `services/gateway/src/routes/realtime-relay.ts` and
 * `docs/AURORA-B5-REALTIME-INVENTORY.md`).
 *
 * Deliberately NOT `new EventSource(url)`: EventSource cannot send custom
 * headers, and these routes are `Authorization: Bearer <jwt>`-gated via
 * the gateway's `requireAuth` middleware — the same compromise
 * `services/gateway/src/routes/reminders.ts`'s own `/stream` route
 * documents needing (it falls back to `?user_id=` instead). This project
 * already has a fetch+`ReadableStream` reader for a different streaming
 * shape (`src/services/aiVoiceService.ts`); this is the equivalent for
 * proper `id:`/`event:`/`data:` SSE framing, which that one doesn't parse.
 *
 * No component uses this yet — see the matching hook file's own header
 * comment for why that's deliberate, not an oversight.
 */

export interface SseEvent {
  id: string | null;
  event: string;
  data: string;
}

/**
 * Parses one buffered chunk of raw SSE text into complete events plus
 * whatever incomplete tail remains (to prepend to the next chunk). SSE
 * events are separated by a blank line; comment lines (starting with
 * `:`, used here for heartbeats) are skipped rather than surfaced.
 */
export function parseSseChunk(buffer: string): { events: SseEvent[]; remainder: string } {
  const events: SseEvent[] = [];
  // Normalize CRLF/CR line endings to LF first — the blank-line separator
  // is otherwise "\r\n\r\n"/"\r\r", not "\n\n", and a real chunk boundary
  // could split a CRLF pair across two reads besides. This gateway's own
  // SSE writer emits LF-only, but the SSE spec allows either, and a test
  // asserting CRLF tolerance caught this the first time it was written
  // without the normalization.
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  // The last element is either an empty string (buffer ended exactly on a
  // blank line) or an incomplete block to carry over to the next chunk.
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    let id: string | null = null;
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue; // comment / heartbeat
      if (line.startsWith('id:')) id = line.slice(3).trim();
      else if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length > 0) {
      events.push({ id, event, data: dataLines.join('\n') });
    }
  }

  return { events, remainder };
}

export interface SseRelayOptions {
  onEvent: (event: SseEvent) => void;
  onError?: (error: unknown) => void;
  signal?: AbortSignal;
}

/**
 * Opens `url` with the given bearer token and feeds every complete SSE
 * event to `onEvent` as it arrives. Resolves when the stream ends
 * (server close, or `signal` aborted) — this project's callers are
 * expected to run it inside a retry/reconnect loop of their own, the same
 * shape `useNotifications.ts`'s Supabase Realtime channel subscription
 * already manages via its own reconnect logic; this function does not
 * reconnect on its own.
 */
export async function consumeSseRelay(url: string, jwt: string, opts: SseRelayOptions): Promise<void> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE relay request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, remainder } = parseSseChunk(buffer);
      buffer = remainder;

      for (const event of events) {
        try {
          opts.onEvent(event);
        } catch (err) {
          opts.onError?.(err);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
