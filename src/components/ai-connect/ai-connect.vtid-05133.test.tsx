/**
 * VTID-05133 — "Connect your AI" (frontend half).
 *
 *   - consent: every Community category is on by default; Approve records the
 *     grant FIRST and approves with Supabase only after it succeeded (fail
 *     closed); Cancel never records anything; no category = no Approve;
 *     health/memory are stated as never shared;
 *   - the consent page routes a Community authorization to this screen and
 *     keeps the supplier screen for Commerce;
 *   - Settings: no Connect buttons while the gateway does not serve the
 *     connector; Disconnect and the per-category switches call the RPCs; the
 *     "find me" switch writes the member's own privacy row;
 *   - lib: parsing never trusts unknown categories; readiness needs the
 *     Community resource;
 *   - copy: the aiConnect namespace has the same keys in every shipped locale.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const rpc = vi.fn();
const upsert = vi.fn();
const selectResult: { data: unknown; error: unknown } = { data: [], error: null };
const privacyResult: { data: unknown; error: unknown } = { data: { ai_discoverable: false }, error: null };

vi.mock('@/integrations/supabase/client', () => {
  const grantsQuery = { select: () => grantsQuery, order: async () => selectResult };
  const privacyQuery = { select: () => privacyQuery, eq: () => privacyQuery, maybeSingle: async () => privacyResult, upsert: (...a: unknown[]) => upsert(...a) };
  return {
    supabase: {
      rpc: (...a: unknown[]) => rpc(...a),
      from: (t: string) => (t === 'ai_connection_grants' ? grantsQuery : privacyQuery),
      auth: { getUser: async () => ({ data: { user: { id: 'me' } } }), getSession: async () => ({ data: { session: null } }) },
    },
  };
});

import { CommunityConsent } from './CommunityConsent';
import { ConnectedAiSection } from './ConnectedAiSection';
import { fetchCommunityMcpReady, parseAuthorizationInfo, parseConnections } from '@/lib/ai-connections';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const LOCALES = readdirSync(resolve(process.cwd(), 'src/i18n')).filter((d) => /^[a-z]{2}$/.test(d));

beforeEach(() => {
  rpc.mockReset();
  upsert.mockReset();
  selectResult.data = [];
  selectResult.error = null;
  privacyResult.data = { ai_discoverable: false };
});

function consent(decide = vi.fn().mockResolvedValue('https://claude.ai/callback?code=x'), go = vi.fn()) {
  render(<CommunityConsent authorizationId="auth-1" clientName="Claude" redirectHost="claude.ai" email="m@example.com" decide={decide} go={go} />);
  return { decide, go };
}

describe('Community consent', () => {
  it('all four categories are on by default and health/memory are never shared', () => {
    consent();
    for (const c of ['profile', 'matches', 'people', 'activities']) {
      expect(screen.getByTestId(`consent-category-${c}`).getAttribute('aria-checked')).toBe('true');
    }
    expect(screen.getByTestId('consent-not-shared')).toBeTruthy();
    expect(screen.getByTestId('consent-redirect-host').textContent).toContain('claude.ai');
  });

  it('Approve records the chosen categories BEFORE approving with Supabase, then follows the redirect', async () => {
    const order: string[] = [];
    rpc.mockImplementation(async () => {
      order.push('grant');
      return { data: {}, error: null };
    });
    const decide = vi.fn(async () => {
      order.push('approve');
      return 'https://claude.ai/callback?code=x';
    });
    const { go } = consent(decide);
    fireEvent.click(screen.getByTestId('consent-category-people'));
    fireEvent.click(screen.getByTestId('consent-approve'));
    await waitFor(() => expect(go).toHaveBeenCalledWith('https://claude.ai/callback?code=x'));
    expect(order).toEqual(['grant', 'approve']);
    expect(rpc).toHaveBeenCalledWith('ai_connection_grant_from_authorization', {
      p_authorization_id: 'auth-1',
      p_categories: ['profile', 'matches', 'activities'],
    });
    expect(decide).toHaveBeenCalledWith(true);
  });

  it('fails closed: if the grant cannot be recorded, nothing is approved', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { decide, go } = consent();
    fireEvent.click(screen.getByTestId('consent-approve'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(decide).not.toHaveBeenCalled();
    expect(go).not.toHaveBeenCalled();
  });

  it('Cancel denies without recording anything', async () => {
    const { decide } = consent();
    fireEvent.click(screen.getByTestId('consent-deny'));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(false));
    expect(rpc).not.toHaveBeenCalled();
  });

  it('no category selected → Approve is disabled', () => {
    consent();
    for (const c of ['profile', 'matches', 'people', 'activities']) fireEvent.click(screen.getByTestId(`consent-category-${c}`));
    expect((screen.getByTestId('consent-approve') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('consent page routing (source pins: the page needs a live OAuth request)', () => {
  const page = read('src/pages/CommerceConnectAuthorize.tsx');
  it('asks the server which product the authorization is for and shows CommunityConsent only for community', () => {
    expect(page).toContain('lookupAuthorizationInfo(authorizationId)');
    expect(page).toContain("view.info?.product === 'community'");
    expect(page).toContain('<CommunityConsent');
  });
  it('a Commerce approval still works without the grant row (best effort)', () => {
    expect(page).toContain("grantFromAuthorization(authorizationId, ['commerce']).catch(() => undefined)");
  });
});

function section() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ConnectedAiSection />
    </QueryClientProvider>,
  );
}

describe('Settings → Connected AI', () => {
  it('shows no Connect buttons while the gateway does not serve the connector', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    section();
    await waitFor(() => expect(screen.getByTestId('connected-ai-empty')).toBeTruthy());
    expect(screen.queryByTestId('connected-ai-buttons')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('shows the buttons and the right address per assistant when the connector is served', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ resource: 'https://g.example/mcp/community', authorization_servers: ['x'] }) }));
    section();
    fireEvent.click(await screen.findByTestId('connect-chatgpt'));
    expect(screen.getByTestId('ai-connect-url').textContent).toMatch(/\/mcp\/community\/chatgpt$/);
    vi.unstubAllGlobals();
  });

  it('lists connections; Disconnect and category switches call the member RPCs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    selectResult.data = [{ client_id: 'c-1', client_name: 'ChatGPT', redirect_host: 'chatgpt.com', categories: ['profile', 'people'], created_at: '2026-10-13T10:00:00Z', revoked_at: null }];
    rpc.mockResolvedValue({ data: {}, error: null });
    section();
    await screen.findByTestId('ai-connection-c-1');
    fireEvent.click(screen.getAllByTestId('ai-connection-category-matches')[0]);
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith('ai_connection_grant_update', { p_client_id: 'c-1', p_categories: ['profile', 'people', 'matches'] }),
    );
    fireEvent.click(screen.getByTestId('ai-connection-disconnect'));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('ai_connection_grant_revoke', { p_client_id: 'c-1' }));
    vi.unstubAllGlobals();
  });

  it('the "find me" switch is off by default and writes only the member\'s own row', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    upsert.mockResolvedValue({ error: null });
    section();
    const sw = await screen.findByTestId('ai-discoverable-switch');
    await waitFor(() => expect((sw as HTMLButtonElement).disabled).toBe(false));
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'me', ai_discoverable: true });
    vi.unstubAllGlobals();
  });
});

describe('lib', () => {
  it('parseConnections drops unknown categories and rows without a client', () => {
    expect(parseConnections([{ client_id: 'a', categories: ['profile', 'health', 'commerce'] }, { categories: ['profile'] }])).toEqual([
      { clientId: 'a', clientName: null, redirectHost: null, categories: ['profile', 'commerce'], createdAt: null, revokedAt: null },
    ]);
  });
  it('parseAuthorizationInfo maps unknown products to unknown', () => {
    expect(parseAuthorizationInfo({ client_id: 'c', product: 'evil' })?.product).toBe('unknown');
    expect(parseAuthorizationInfo(null)).toBeNull();
  });
  it('readiness needs the Community resource', async () => {
    expect(await fetchCommunityMcpReady(async () => ({ ok: true, json: async () => ({ resource: 'https://g/mcp', authorization_servers: ['x'] }) }))).toBe(false);
    expect(await fetchCommunityMcpReady(async () => ({ ok: true, json: async () => ({ resource: 'https://g/mcp/community', authorization_servers: ['x'] }) }))).toBe(true);
    expect(await fetchCommunityMcpReady(async () => { throw new Error('x'); })).toBe(false);
  });
});

describe('copy', () => {
  it('aiConnect has identical keys in every shipped locale, DE du-form, placeholders kept', () => {
    const keys = (o: Record<string, unknown>, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
    const de = JSON.parse(read('src/i18n/de/aiConnect.json')).aiConnect;
    const ref = keys(de).sort();
    expect(LOCALES.length).toBeGreaterThanOrEqual(11);
    for (const l of LOCALES) {
      const cat = JSON.parse(read(`src/i18n/${l}/aiConnect.json`)).aiConnect;
      expect(keys(cat).sort(), l).toEqual(ref);
      expect(cat.consent.title, l).toContain('{client}');
      expect(cat.settings.howTitle, l).toContain('{assistant}');
    }
    expect(JSON.stringify(de)).not.toMatch(/\b(Sie|Ihr|Ihnen)\b/);
  });
});
