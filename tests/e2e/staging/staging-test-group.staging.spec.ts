// Staging-only test group — read-only lookup by name.
//
// Purpose: the STAGING-VERIFY group-chat test needs ONE group that exists only
// for testing: no real members, hidden from the group directory (and therefore
// from group search, the group list and suggestions built on it), named
// `staging-test-group`. This spec does NOT create that group. Creating it is a
// write to the shared Supabase project and needs the owner's explicit approval
// of that exact action (see the PR checklist).
//
// It only looks the group up by name and checks its shape with GET requests.
// './staging-guard' (copied in by the runner) aborts every non-GET request
// except the sign-in token call, so this spec cannot write anything.
//
// If the group does not exist yet, this spec FAILS on purpose. A missing group
// must never let STAGING-VERIFY pass by skipping.
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
export const TEST_GROUP_NAME = 'staging-test-group';

async function signIn(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const apikey = await anonKey(page, request);
  const session = await (
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, { headers: { apikey, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  return { userId: session.user.id as string, token: session.access_token as string, apikey };
}

// The publishable (anon) key is shipped in the built bundle; read it from there.
async function anonKey(page: Page, request: APIRequestContext): Promise<string> {
  const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(entry)).text();
  const key = [...bundle.matchAll(/eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].find((m) => {
    try {
      const p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'));
      return p.role === 'anon' && p.ref === 'inmkhvwdcuyhnxkgfvsb';
    } catch {
      return false;
    }
  })?.[0];
  expect(key, 'no Supabase publishable key in the bundle').toBeTruthy();
  return key!;
}

async function getRows<T>(request: APIRequestContext, auth: { token: string; apikey: string }, path: string): Promise<T[]> {
  const res = await request.get(`${SUPABASE}/rest/v1/${path}`, {
    headers: { apikey: auth.apikey, Authorization: `Bearer ${auth.token}`, Accept: 'application/json' },
  });
  expect(res.status(), `GET ${path} failed`).toBe(200);
  return (await res.json()) as T[];
}

test.describe('staging-test-group (read-only)', () => {
  test(`"${TEST_GROUP_NAME}" exists, is hidden from the directory and has no real members`, async ({ page, request }) => {
    const auth = await signIn(page, request);
    const encoded = encodeURIComponent(TEST_GROUP_NAME);

    // 1. Lookup by name. Exactly one group, approved, not public.
    const groups = await getRows<{ id: string; name: string; is_public: boolean; status: string; created_by: string }>(
      request,
      auth,
      `global_community_groups?select=id,name,is_public,status,created_by&name=eq.${encoded}`,
    );
    expect(groups, `no group named "${TEST_GROUP_NAME}" — create it only after the owner approves the action`).toHaveLength(1);
    const group = groups[0];
    expect(group.is_public, 'test group must not be public').toBe(false);
    expect(group.status, 'test group must be approved (same as CreateGroupPopup)').toBe('approved');

    // 2. Hidden from the directory: the public directory query must not return it.
    const directory = await getRows<{ id: string }>(
      request,
      auth,
      `global_community_groups?select=id&status=eq.approved&is_public=eq.true&name=eq.${encoded}`,
    );
    expect(directory, 'test group leaked into the public group directory').toHaveLength(0);

    // 3. No real members: every member is the test account itself.
    const members = await getRows<{ user_id: string; role: string }>(
      request,
      auth,
      `global_community_group_members?select=user_id,role&group_id=eq.${group.id}`,
    );
    expect(members.length, 'test group has no members').toBeGreaterThan(0);
    for (const m of members) {
      expect(m.user_id, 'a real member is in the test group').toBe(auth.userId);
    }
  });
});
