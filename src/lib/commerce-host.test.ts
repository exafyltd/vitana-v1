/**
 * VTID-03882. The MCP endpoint PATH is the thing worth pinning: a merchant who
 * pastes the bare host into their agent gets a connector that cannot reach the
 * server, and the failure surfaces inside their AI client, not here.
 */
import { describe, expect, it } from 'vitest';
import { MCP_SERVER_URL, MY_PORTAL_API, isCommerceHost } from './commerce-host';

describe('MCP_SERVER_URL', () => {
  it('points at the /mcp endpoint, not the bare host', () => {
    expect(MCP_SERVER_URL.endsWith('/mcp')).toBe(true);
  });

  it('never doubles the path segment', () => {
    expect(MCP_SERVER_URL.match(/\/mcp/g)).toHaveLength(1);
  });

  it('is an absolute https URL', () => {
    expect(() => new URL(MCP_SERVER_URL)).not.toThrow();
    expect(new URL(MCP_SERVER_URL).protocol).toBe('https:');
  });
});

describe('MY_PORTAL_API', () => {
  it('stays on the owner-scoped surface', () => {
    expect(MY_PORTAL_API).toBe('/api/v1/vcaop/portal/my');
  });
});

describe('isCommerceHost', () => {
  it('matches the dedicated host case-insensitively', () => {
    expect(isCommerceHost('commerce.vitanaland.com')).toBe(true);
    expect(isCommerceHost('COMMERCE.VITANALAND.COM')).toBe(true);
  });

  it('does not match the apex or a preview host', () => {
    expect(isCommerceHost('vitanaland.com')).toBe(false);
    expect(isCommerceHost('preview-aws.vitanaland.com')).toBe(false);
  });
});
