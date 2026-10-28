// VTID-05250 — types for the fixture gateway (server.js is plain Node, never bundled in the app).

export interface AppConfigScenario {
  schemaVersion: number;
  ttlSeconds: number;
  flags: Record<string, boolean>;
  minSupportedVersion: string;
  recommendedVersion: string | null;
  updateUrl: string | null;
}

export interface FixtureScenario {
  authMeStatus: number;
  authMe: Record<string, unknown>;
  appConfig: AppConfigScenario;
}

export interface RecordedToken {
  token: string;
  device_type: 'ios' | 'android';
  at: number;
}

export interface RecordedRequest {
  method: string | undefined;
  path: string;
  authorization: string | null;
}

export interface FixtureGateway {
  tokens: RecordedToken[];
  requests: RecordedRequest[];
  setScenario(patch: Partial<FixtureScenario>): void;
  start(port?: number): Promise<{ host: string; port: number; url: string }>;
  stop(): Promise<void>;
}

export function createFixtureGateway(options?: { host?: string; scenario?: Partial<FixtureScenario> }): FixtureGateway;
export function defaultScenario(): FixtureScenario;
export function buildAppConfigBody(cfg: AppConfigScenario): Record<string, unknown>;
export function buildAasa(): Record<string, unknown>;
export function buildAssetlinks(): Array<Record<string, unknown>>;
export function isAllowedBindHost(host: string): boolean;
export function firstLanAddress(): string | null;
export const IDENTIFIERS: { ios: string; android: string };
export const ROUTES: {
  appConfig: string;
  authMe: string;
  notificationsToken: string;
  aasa: string;
  assetlinks: string;
};
