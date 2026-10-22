/**
 * VTID-05184 — ports (N5a, "Interfaces"). N3 (auth session) and N4 (app
 * config) are separate Wave 1 VTIDs; until they merge, the stubs below keep
 * the module dark: signed out and flag off, so it never runs.
 */
import type { Category, SyncPlatform } from './contract/v1/catalogue';

/** N3 — the member's session. Its secure-store entries must use AFTER_FIRST_UNLOCK so background passes can read them. */
export interface AuthPort {
  getSession(): Promise<{ user_id: string; tenant_id: string } | null>;
  /** The Supabase access token, refreshed when it expires within 60 s. */
  getAccessToken(): Promise<string | null>;
  refresh(): Promise<boolean>;
  onChange(cb: (s: { user_id: string } | null) => void): () => void;
}

/** N4 — app config. `false` when unknown or unreachable ("features default off"). */
export interface AppConfigPort {
  getFlag(flag: 'health_sync', platform: SyncPlatform): boolean;
  onChange(cb: () => void): () => void;
}

export interface HttpRequest {
  method: 'GET' | 'POST';
  url: string;
  headers: Record<string, string>;
  body?: string | Uint8Array;
  timeoutMs: number;
}

export type HttpResponse = { status: number; headers: Record<string, string>; json: unknown } | { error: 'network' | 'timeout' };

export interface HttpPort {
  request(req: HttpRequest): Promise<HttpResponse>;
}

export interface ClockPort {
  now(): number;
}

export type LogFields = Record<string, unknown>;

export interface LoggerPort {
  log(event: string, fields?: LogFields): void;
}

/** Device facts for the `source` block. */
export interface DevicePort {
  os: string;
  osVersion: string;
  appVersion: string;
  manufacturer: string | null;
  model: string | null;
  /** The device's IANA time zone. */
  timeZone(): string;
}

/** Install id: randomUUID() once per install, secure-store `…_THIS_DEVICE_ONLY`. Not a credential. */
export interface InstallIdPort {
  get(): Promise<string>;
}

/** Background scheduling (expo-background-task / HealthKit observers). */
export interface SchedulerPort {
  register(categories: readonly Category[]): Promise<void>;
  clear(): Promise<void>;
}

export const signedOutAuthStub: AuthPort = {
  getSession: async () => null,
  getAccessToken: async () => null,
  refresh: async () => false,
  onChange: () => () => undefined,
};

export const flagOffConfigStub: AppConfigPort = {
  getFlag: () => false,
  onChange: () => () => undefined,
};

export const systemClock: ClockPort = { now: () => Date.now() };

/** Default HttpPort: fetch with a timeout. JSON is parsed when the body is JSON, else `json: undefined`. */
export const fetchHttp: HttpPort = {
  async request(req) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs);
    try {
      const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body as BodyInit | undefined, signal: controller.signal });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        json = undefined;
      }
      return { status: res.status, headers, json };
    } catch (err) {
      return { error: controller.signal.aborted ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  },
};
