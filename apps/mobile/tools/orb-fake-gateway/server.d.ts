// VTID-05179 — types for the fake ORB gateway (server.js is plain Node, never bundled in the app).
export interface FakeScenario {
  transport?: 'ws' | 'sse' | null;
  fullDuplex?: boolean;
  playbackLeadFirstOnly?: boolean;
  authMeStatus?: number;
  rejectStart?: { code: string } | null;
  transportFailure?: boolean;
  silentHandshake?: boolean;
  interruptReply?: boolean;
  afterAudioReady?: Array<Record<string, unknown>>;
  endAfterMs?: number | null;
}

export interface RecordedFrame {
  at: number;
  via: 'ws' | 'sse';
  session?: string;
  type: string;
  mime?: string;
  bytes?: number;
  silent?: boolean;
  msg?: Record<string, unknown>;
}

export interface RecordedRequest {
  method: string;
  path: string;
  url: string;
  authorization: string | null;
}

export interface FakeGateway {
  frames: RecordedFrame[];
  requests: RecordedRequest[];
  setScenario(patch: FakeScenario): void;
  broadcast(msg: Record<string, unknown>): void;
  start(port?: number): Promise<{ host: string; port: number; url: string }>;
  stop(): Promise<void>;
}

export function createFakeGateway(options?: { host?: string; scenario?: FakeScenario; outFile?: string }): FakeGateway;
export const SCENARIOS: Record<string, FakeScenario>;
export const DEFAULT_SCENARIO: FakeScenario;
export const GREETING: Record<string, unknown>;
export function isAllowedBindHost(host: string): boolean;
export function firstLanAddress(): string | null;
// The `ws` client, re-exported so tests can drive the WS transport over loopback.
export const WebSocket: new (url: string, protocols?: string | string[], options?: { headers?: Record<string, string> }) => unknown;
