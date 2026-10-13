// STUB(N1): replace with apps/mobile/src/config/env.ts `config`, `requireValue`, `endpoints`, `assertNotProductionKey` (N1 plan change 8) — awaits packages/core (VTID-05183)
/**
 * VTID-05186 (N3) — BRANCH-ONLY stand-in for N1's env.ts additions. N3 does
 * not own the key check (plan change 5): this copy only keeps the branch
 * honest until N1 merges, then `src/ports/env.ts` re-exports N1's names and
 * this file is deleted.
 */
import { config as baseConfig, requireUrl, ConfigMissingError, type AppConfig } from '../config/env';
import type { CoreEndpoints } from './core';

/** The production Supabase project ref (CLAUDE.md); a key for it is refused. */
const PROD_REF = 'inmkhvwdcuyhnxkgfvsb';

function decodeBase64Url(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  if (typeof atob === 'function') return atob(padded);
  // jest/node
  return Buffer.from(padded, 'base64').toString('utf8');
}

/** Legacy JWT anon keys: payload `ref`; `sb_publishable_…`: the ref as a `_` segment; anything else is invalid. */
export function assertNotProductionKey(key: string): string {
  const value = key.trim();
  if (value.startsWith('sb_publishable_')) {
    if (value.split('_').includes(PROD_REF)) throw new Error('Refusing the production Supabase publishable key (VTID-05157). Use the G1 test project.');
    return value;
  }
  const parts = value.split('.');
  if (parts.length === 3) {
    let payload: { ref?: string } | null = null;
    try {
      payload = JSON.parse(decodeBase64Url(parts[1]));
    } catch {
      payload = null;
    }
    if (!payload) throw new Error('Invalid Supabase key: not a JWT and not an sb_publishable_ key.');
    if (payload.ref === PROD_REF) throw new Error('Refusing the production Supabase anon key (VTID-05157). Use the G1 test project.');
    return value;
  }
  throw new Error('Invalid Supabase key: not a JWT and not an sb_publishable_ key.');
}

export type CoreAppConfig = AppConfig & { supabasePublishableKey?: string };

export function loadKeyConfig(source: CoreAppConfig): CoreAppConfig {
  const key = source.supabasePublishableKey?.trim();
  return key ? { ...source, supabasePublishableKey: assertNotProductionKey(key) } : { ...source };
}

export const config: CoreAppConfig = loadKeyConfig({
  ...baseConfig,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

/** A non-URL value, or ConfigMissingError. Never a default. */
export function requireValue(cfg: CoreAppConfig, key: 'supabasePublishableKey' | 'googleWebClientId' | 'googleIosClientId'): string {
  const value = cfg[key]?.trim();
  if (!value) throw new ConfigMissingError([key]);
  return key === 'supabasePublishableKey' ? assertNotProductionKey(value) : value;
}

/** The four client values, each through the host/key checks. Missing values are reported together. */
export function endpoints(cfg: CoreAppConfig): CoreEndpoints {
  const missing = (['gatewayUrl', 'supabaseUrl', 'supabasePublishableKey'] as const).filter((k) => !cfg[k]);
  if (missing.length) throw new ConfigMissingError(missing);
  return {
    gatewayOrigin: requireUrl(cfg, 'gatewayUrl'),
    supabaseUrl: requireUrl(cfg, 'supabaseUrl'),
    supabasePublishableKey: requireValue(cfg, 'supabasePublishableKey'),
    ...(cfg.dataApiUrl ? { dataApiUrl: requireUrl(cfg, 'dataApiUrl') } : {}),
  };
}
