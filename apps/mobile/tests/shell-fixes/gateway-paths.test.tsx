/**
 * VTID-05647 (native-shell-fixes-r2/shell-fixes) — the shell's gateway reads pass the path AFTER `/api/v1`
 * (`createGatewayFetch` adds the prefix). A real `createGatewayFetch` with a recording fake `fetchImpl` is
 * installed, so the test sees the final URL; the shared fake gateway replaces the whole client and cannot.
 *
 * `useMyPartnerOrgs` (`/api/v1/partner-orgs/mine` doubled too) is NOT covered here: fixing it turns the existing fixtures
 * `tests/shell.test.tsx:49` red (keyed on the doubled path, outside this lane's paths; owner rule: no edits to
 * existing tests). Reported as blocked in the PR.
 */
import '../helpers/no-network';
import '../helpers/mocks';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createSupabaseDouble, fakeSession } from '../helpers/supabase-double';
import { makeWrapper } from '../helpers/providers';
import { __setGatewayForTests } from '../../src/auth/gateway';
import { createGatewayFetch } from '../../src/ports/core';
import { GuidedModeProvider, useGuidedMode } from '../../src/identity/GuidedModeProvider';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), replace: jest.fn(), push: jest.fn() }, usePathname: () => '/home' }));

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

function wrapper() {
  const client = createSupabaseDouble({ session, tables: { tenants: [], patient_profiles: [] }, rpc: {} }).client;
  return makeWrapper({ client });
}

afterEach(() => __setGatewayForTests(null));

describe('shell gateway paths', () => {
  it('GuidedModeProvider requests exactly <origin>/api/v1/journey/state and follows the state', async () => {
    const W = wrapper();
    const urls = install({
      'https://gw.test/api/v1/journey/state': { ok: true, state: { mode: 'guided', onboardingStatus: 'started', enteredFullModeAt: null, returnedToGuidedAt: null, qualifiedAt: null } },
    });
    const { result } = renderHook(() => useGuidedMode(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <W>
          <GuidedModeProvider>{children}</GuidedModeProvider>
        </W>
      ),
    });
    await waitFor(() => expect(result.current.mode).toBe('guided'));
    expect(urls).toEqual(['https://gw.test/api/v1/journey/state']);
  });
});
