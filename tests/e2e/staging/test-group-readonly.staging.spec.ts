// Read-only check of the "TEST GROUP" chat thread (created by the owner for testing).
//
// Looks the thread up by its id and checks that its participants are exactly the
// owner's account (admin) and the dedicated test account (member). GET requests only;
// './staging-guard' aborts every other request except sign-in.
//
// Note: the owner is a real member of this group, so it is NOT a "no real members"
// group. Do not add writes here; any write needs a separate approval.
import type { Page, APIRequestContext } from '@playwright/test';
import { test, expect } from './staging-guard';

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const THREAD_ID = '06e8954e-162a-4da0-b889-ce6092e2733b';
const OWNER_ID = '0adc6ff6-acb0-4dca-99d0-295211a40e3e';
const TEST_ACCOUNT_ID = 'af9ce9ea-e317-46ec-9689-6da591ffdbf0';

async function anonKey(page: Page, request: APIRequestContext): Promise<string> {
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
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

test('TEST GROUP thread: participants are exactly the owner (admin) and the test account (member)', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  const apikey = await anonKey(page, request);
  const session = await (
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, { headers: { apikey, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();
  const auth = { apikey, Authorization: `Bearer ${session.access_token}`, Accept: 'application/json' };

  const threads = await (await request.get(`${SUPABASE}/rest/v1/global_message_threads?select=id,name,type&id=eq.${THREAD_ID}`, { headers: auth })).json();
  expect(threads, 'TEST GROUP thread not visible to the test account').toHaveLength(1);
  expect(threads[0]).toMatchObject({ name: 'TEST GROUP', type: 'group' });

  const parts = await (await request.get(`${SUPABASE}/rest/v1/global_thread_participants?select=user_id,role&thread_id=eq.${THREAD_ID}`, { headers: auth })).json();
  const byUser = Object.fromEntries(parts.map((p: { user_id: string; role: string }) => [p.user_id, p.role]));
  expect(byUser, 'participants changed from owner (admin) + test account (member)').toEqual({ [OWNER_ID]: 'admin', [TEST_ACCOUNT_ID]: 'member' });
});
