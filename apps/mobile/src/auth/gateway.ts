/**
 * VTID-05186 (N3) — the gateway client for shell reads (partner orgs, journey
 * state), N1's `createGatewayFetch` with the Supabase access token
 * (web `community-gateway.ts:14`). The origin comes from `endpoints(config)`.
 */
import { createGatewayFetch, gatewayJson, type GatewayFetch } from '../ports/core';
import { config, endpoints } from '../ports/env';
import { getAccessToken } from './client';

let fetcher: GatewayFetch | null = null;

export function getGateway(): GatewayFetch {
  if (!fetcher) {
    fetcher = createGatewayFetch({ origin: endpoints(config).gatewayOrigin, getAccessToken, fetchImpl: (...a) => fetch(...a) });
  }
  return fetcher;
}

export function __setGatewayForTests(f: GatewayFetch | null): void {
  fetcher = f;
}

export function gatewayGet<T>(path: string): Promise<T> {
  return gatewayJson<T>(getGateway(), path);
}
