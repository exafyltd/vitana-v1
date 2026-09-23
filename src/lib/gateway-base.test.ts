/** VTID-04335 — the gateway origin never falls back to the deleted GCP host. */
import { describe, it, expect } from 'vitest';
import { resolveGatewayBase, DEFAULT_GATEWAY_ORIGIN } from './gateway-base';

describe('resolveGatewayBase', () => {
  it('prefers VITE_GATEWAY_BASE and strips a trailing slash', () => {
    expect(resolveGatewayBase({ VITE_GATEWAY_BASE: 'https://preview-aws-gateway.vitanaland.com/' })).toBe('https://preview-aws-gateway.vitanaland.com');
  });
  it('derives the origin from VITE_GATEWAY_URL (which carries /api/v1)', () => {
    expect(resolveGatewayBase({ VITE_GATEWAY_URL: 'https://preview-aws-gateway.vitanaland.com/api/v1' })).toBe('https://preview-aws-gateway.vitanaland.com');
    expect(resolveGatewayBase({ VITE_GATEWAY_URL: 'https://gw.example/api/v1/' })).toBe('https://gw.example');
  });
  it('falls back to the AWS production gateway, never a run.app host', () => {
    expect(resolveGatewayBase({})).toBe(DEFAULT_GATEWAY_ORIGIN);
    expect(resolveGatewayBase({ VITE_GATEWAY_BASE: '  ', VITE_GATEWAY_URL: '' })).toBe('https://gateway.vitanaland.com');
    expect(DEFAULT_GATEWAY_ORIGIN).not.toContain('run.app');
  });
});
