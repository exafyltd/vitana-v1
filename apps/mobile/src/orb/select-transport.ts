/**
 * VTID-05179 — transport selection (N6a, Change 3; widget `_useWsTransport`, orb-widget.js:217-232, :1409-1430).
 *
 * Order, highest first:
 *   1. a development-profile override (`EXPO_PUBLIC_ORB_TRANSPORT`, read by
 *      the caller; there is no localStorage override in the native app);
 *   2. the process latch, set when a WS start failed for a TRANSPORT reason —
 *      it holds for the rest of the app process;
 *   3. the server's answer from `GET /api/v1/orb/live/transport`;
 *   4. `sse` when that answer is missing or malformed (VTID-05001).
 * A server REJECTION during a WS start is never retried on SSE.
 */
import { ORB_ROUTES } from './protocol';
import type { FetchLike, TransportKind } from './transport';

let sseLatched = false;

export function latchSse(): void {
  sseLatched = true;
}

export function isSseLatched(): boolean {
  return sseLatched;
}

/** Tests only. */
export function resetTransportLatchForTests(): void {
  sseLatched = false;
}

/** The dev override applies only to the `development` profile. */
export function devTransportOverride(profile: string | undefined, value: string | undefined): TransportKind | undefined {
  if (profile !== 'development') return undefined;
  return value === 'ws' || value === 'sse' ? value : undefined;
}

export async function selectTransport(opts: {
  base: string;
  fetchImpl: FetchLike;
  override?: TransportKind;
}): Promise<TransportKind> {
  if (opts.override) return opts.override;
  if (sseLatched) return 'sse';
  try {
    const res = await opts.fetchImpl(`${opts.base}${ORB_ROUTES.transport}`, { method: 'GET' });
    if (!res.ok) return 'sse';
    const body = (await res.json()) as { transport?: unknown } | null;
    return body && body.transport === 'ws' ? 'ws' : 'sse';
  } catch {
    return 'sse';
  }
}
