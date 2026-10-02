// VTID-04848 — "Connect your AI agent": the MCP address, readiness and consent.
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));

import {
  COMMERCE_MCP_METADATA_URL,
  COMMERCE_MCP_TOOL_NAMES,
  COMMERCE_MCP_URL,
  CONNECT_AUTHORIZE_PATH,
  SUPPORTED_ASSISTANTS,
  fetchMcpReady,
  parseConsentDecision,
  parseConsentDetails,
} from './commerce-mcp';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const res = (ok: boolean, body: unknown) => async () => ({ ok, json: async () => body });

describe('the MCP address (VTID-04848)', () => {
  it('is the gateway this build talks to, at /mcp, with its RFC 9728 metadata beside it', () => {
    expect(COMMERCE_MCP_URL).toMatch(/^https?:\/\/[^/]+\/mcp$/);
    expect(COMMERCE_MCP_METADATA_URL).toBe(COMMERCE_MCP_URL.replace(/\/mcp$/, '/.well-known/oauth-protected-resource/mcp'));
  });

  it('names Claude, ChatGPT and Gemini, in that order', () => {
    expect([...SUPPORTED_ASSISTANTS]).toEqual(['Claude', 'ChatGPT', 'Gemini']);
  });

  it('lists the same tools the gateway serves', () => {
    const gatewayTools = [
      'get_onboarding_status',
      'create_business',
      'update_business',
      'add_product',
      'list_products',
      'update_product',
      'submit_for_verification',
    ];
    expect([...COMMERCE_MCP_TOOL_NAMES]).toEqual(gatewayTools);
  });
});

describe('fetchMcpReady — the portal never offers a button that leads nowhere', () => {
  it('is true only for metadata naming /mcp and a sign-in server', async () => {
    expect(await fetchMcpReady(res(true, { resource: 'https://g.example/mcp', authorization_servers: ['https://a.example/auth/v1'] }))).toBe(true);
  });

  it('is false while the gateway answers 404 (COMMERCE_MCP_ENABLED off)', async () => {
    expect(await fetchMcpReady(res(false, { ok: false, error: 'COMMERCE_MCP_DISABLED' }))).toBe(false);
  });

  it('is false without a sign-in server, for another resource, or on a network error', async () => {
    expect(await fetchMcpReady(res(true, { resource: 'https://g.example/mcp', authorization_servers: [] }))).toBe(false);
    expect(await fetchMcpReady(res(true, { resource: 'https://g.example/other', authorization_servers: ['x'] }))).toBe(false);
    expect(
      await fetchMcpReady(async () => {
        throw new Error('offline');
      }),
    ).toBe(false);
  });
});

describe('consent details from Supabase Auth', () => {
  it('reads the assistant name and scopes', () => {
    const r = parseConsentDetails('auth-1', {
      authorization_id: 'auth-1',
      client: { client_name: 'Claude', client_uri: 'https://claude.ai' },
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      scope: 'openid email',
    });
    expect(r.kind).toBe('consent');
    if (r.kind !== 'consent') return;
    expect(r.details.clientName).toBe('Claude');
    expect(r.details.clientUri).toBe('https://claude.ai');
    expect(r.details.scopes).toEqual(['openid', 'email']);
  });

  it('an assistant approved before goes straight back', () => {
    expect(parseConsentDetails('a', { redirect_url: 'https://claude.ai/cb?code=x' })).toEqual({
      kind: 'redirect',
      url: 'https://claude.ai/cb?code=x',
    });
  });

  it('follows only an absolute http(s) redirect after the decision', () => {
    expect(parseConsentDecision({ redirect_url: 'https://chatgpt.com/cb?code=y' })).toBe('https://chatgpt.com/cb?code=y');
    expect(parseConsentDecision({ redirect_url: 'javascript:alert(1)' })).toBeNull();
    expect(parseConsentDecision({})).toBeNull();
  });
});

describe('wiring (VTID-04848)', () => {
  const portal = read('src/pages/CommercePortal.tsx');
  const panel = read('src/components/commerce/McpConnectPanel.tsx');
  const app = read('src/App.tsx');

  it('the hero leads with "Connect your AI agent" and keeps "Register manually" secondary once MCP is ready', () => {
    const block = portal.slice(portal.indexOf('{mcpReady ? ('), portal.indexOf("t('screens.commerceportal.mcpConnect.manualCta')"));
    expect(block).toContain('onClick={() => setMcpOpen(true)}');
    expect(block).toContain("t('screens.commerceportal.mcpConnect.cta')");
    expect(block).toContain('variant="outline"');
    expect(block).toContain('onClick={() => setRegisterOrgOpen(true)}');
  });

  it('a first-time supplier gets the MCP panel first, before website reading or a form', () => {
    expect(portal).toContain('if (mcpReady) setMcpOpen(true);\n    else if (aiReady) setAiSetupOpen(true);\n    else setRegisterOrgOpen(true);');
    expect(portal).toContain('void fetchMcpReady().then(setMcpReady);');
  });

  it('the panel: address + one Copy action; help and developer detail collapsed', () => {
    expect(panel).toContain('{COMMERCE_MCP_URL}');
    expect(panel).toContain('data-testid="mcp-copy"');
    expect(panel).toContain('const [helpOpen, setHelpOpen] = useState(false);');
    expect(panel).toContain('const [advancedOpen, setAdvancedOpen] = useState(false);');
    expect(panel).toContain('{helpOpen && (');
    expect(panel).toContain('{advancedOpen && (');
  });

  it('the consent route sits under /commerce, behind sign-in', () => {
    expect(CONNECT_AUTHORIZE_PATH).toBe('/commerce/connect/authorize');
    expect(app).toContain('<Route path="/commerce/connect/authorize" element={<AuthGuard><CommerceConnectAuthorize /></AuthGuard>} />');
  });
});
