/**
 * VTID-05726 (native-followups-20261111/partner-orgs-path) — `useMyPartnerOrgs` passes the path AFTER `/api/v1`
 * (`createGatewayFetch` adds the prefix, packages/core/src/gateway.ts:22). A real `createGatewayFetch` with a
 * recording `fetchImpl` is installed so the test sees the final URL; the shared fake gateway replaces the whole
 * client and cannot. Pattern copied from tests/shell-fixes/gateway-paths.test.tsx (PR #1645), not imported.
 */
import '../../helpers/no-network';
import '../../helpers/mocks';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../../helpers/supabase-double';
import { makeWrapper } from '../../helpers/providers';
import { __setGatewayForTests } from '../../../src/auth/gateway';
import { createGatewayFetch } from '../../../src/ports/core';
import { useMyPartnerOrgs } from '../../../src/identity/useMyPartnerOrgs';

const session = fakeSession('u-1', { user: { id: 'u-1', app_metadata: { active_tenant_id: 't-maxina' }, user_metadata: {} } });

function install(bodies: Record<string, unknown>) {
  const urls: string[] = [];
  const fetchImpl = async (url: string) => {
    urls.push(String(url));
    const body = bodies[String(url)];
    return { ok: body !== undefined, status: body !== undefined ? 200 : 404, text: async () => (body === undefined ? '' : JSON.stringify(body)) } as unknown as Response;
  };
  __setGatewayForTests(createGatewayFetch({ origin: 'https://gw.test', getAccessToken: async () => 't', fetchImpl: fetchImpl as never }));
  return urls;
}

afterEach(() => __setGatewayForTests(null));

describe('useMyPartnerOrgs gateway path', () => {
  it('requests exactly <origin>/api/v1/partner-orgs/mine and returns the organizations', async () => {
    const client = createSupabaseDouble({ session, tables: { tenants: [] }, rpc: {} }).client;
    const wrapper = makeWrapper({ client });
    const orgs = [{ id: 'org-1', display_name: 'Lab', role: 'org_admin' }];
    const urls = install({ 'https://gw.test/api/v1/partner-orgs/mine': { organizations: orgs } });
    const { result } = renderHook(() => useMyPartnerOrgs(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(orgs));
    expect(urls).toEqual(['https://gw.test/api/v1/partner-orgs/mine']);
  });
});
