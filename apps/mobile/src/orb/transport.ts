/**
 * VTID-05179 — the transport contract shared by the WS and SSE transports (N6a, Change 3).
 */
import type { ClientMessage, ServerMessage, StartPayload } from './protocol';

export type TransportKind = 'ws' | 'sse';

export interface StartResult {
  sessionId: string;
  conversationId?: string;
  /** WS only (`session_started.full_duplex`); on SSE it arrives later in `live_api_ready`. */
  fullDuplex?: boolean;
  playbackLeadFirstOnly: boolean;
}

export interface TransportEvents {
  onMessage(msg: ServerMessage): void;
  /** The connection ended after a successful start (not called for a failed start). */
  onClose(info: { reason: string }): void;
}

export interface OrbTransport {
  readonly kind: TransportKind;
  start(payload: StartPayload): Promise<StartResult>;
  send(msg: ClientMessage): void;
  /** `audio_ready` (WS in-band) or `POST /orb/session/:id/audio-ready` (SSE). */
  signalAudioReady(): void;
  /** Sends `stop` / `POST /live/session/stop` and releases the connection. Never awaits the network. */
  close(): void;
}

/**
 * Why a start failed. `transport` (blocked upgrade, socket closed before the
 * handshake, the 8 s budget) may fall back to SSE; `rejected` (the server
 * answered `error`, 401/403, `ok:false`) never does: SSE would be rejected the
 * same way (orb-widget.js:2632-2657, :2927-2938).
 */
export class OrbStartError extends Error {
  constructor(
    message: string,
    readonly kind: 'transport' | 'rejected',
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = 'OrbStartError';
  }
}

/** The subset of `fetch` the transports use (injectable for tests). */
export type FetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: unknown },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export function defaultFetch(): FetchLike {
  return ((url, init) => fetch(url, init as RequestInit)) as FetchLike;
}

/** Resolves after `ms`, or rejects the race with an `OrbStartError('transport')`. */
export function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new OrbStartError(`${what} timed out after ${ms} ms`, 'transport', 'timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
