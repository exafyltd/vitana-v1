// VTID-04936 — creating a group from "Neue Unterhaltung" (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. This spec writes NOTHING: every request
// the dialog makes that is not a GET is answered INSIDE the browser with
// page.route → fulfill and never leaves the page —
//   - rpc/search_global_directory (a SELECT-only lookup PostgREST sends as POST)
//     returns two made-up profiles, so no real member is picked;
//   - the group writes (global_message_threads, global_thread_participants,
//     global_messages) are recorded and answered 201.
// The guard's rules are not widened.
//
// What it proves on the deployed chunk: the dialog creates the thread with a
// client-generated id WITHOUT selecting it back (the select-after-insert is
// what RLS rejected with 403 in production), adds the creator alone as admin
// first and the members in a later request, and shows the success toast.
// What it cannot prove: the real RLS policies (no write ever reaches the
// database) — that rests on the policy analysis in
// docs/validation/VTID-04936/plan-sparring.md.
import type { Page, APIRequestContext, Request } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

// Made-up people: never real members.
const FAKE = [
  { user_id: '0e5e0000-0000-4000-8000-000000000a01', display_name: 'Test Person Eins', full_name: 'Test Person Eins', email: 'eins@example.invalid', avatar_url: null, bio: null },
  { user_id: '0e5e0000-0000-4000-8000-000000000a02', display_name: 'Test Person Zwei', full_name: 'Test Person Zwei', email: 'zwei@example.invalid', avatar_url: null, bio: null },
];

async function signIn(page: Page, request: APIRequestContext) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

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
  const session = await (
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, { headers: { apikey: key!, 'Content-Type': 'application/json' }, data: { email, password } })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
  return session.user.id as string;
}

test('group from "Neue Unterhaltung": client id, no select-back, creator first, success toast', async ({ page, request }) => {
  const me = await signIn(page, request);

  await page.route(/\/rest\/v1\/rpc\/search_global_directory/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE) }),
  );
  const writes: Request[] = [];
  await page.route(/\/rest\/v1\/(global_message_threads|global_thread_participants|global_messages)(\?|$)/, (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    writes.push(route.request());
    return route.fulfill({ status: 201, body: '' });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/inbox', { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: /^(Neu|New)$/ }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Adding a person clears the search, so search once per person.
  for (const person of FAKE) {
    await dialog.locator('#search').fill('Test Person');
    await dialog.locator('#search').press('Enter');
    const row = dialog.locator('div.border', { hasText: person.display_name });
    await row.getByRole('button', { name: /^(Hinzufügen|Add)$/ }).click();
    await expect(dialog.getByText(person.display_name).first()).toBeVisible();
  }

  // Two recipients switch the dialog to group mode with a prefilled name.
  await expect(dialog.locator('#groupName')).not.toHaveValue('');
  await dialog.getByRole('button', { name: /^(Gruppe erstellen|Create Group)$/ }).click();

  await expect.poll(() => writes.length, { message: 'no group write was made' }).toBeGreaterThan(0);
  const byTable = (t: string) => writes.filter((w) => new URL(w.url()).pathname.endsWith(`/${t}`));
  const [thread] = byTable('global_message_threads');
  // The production failure: the thread insert asked for the row back
  // (Prefer: return=representation + ?select=) and RLS refused it.
  expect(thread, 'no thread insert').toBeTruthy();
  expect(thread.headers()['prefer'] ?? '', 'thread insert must not select the row back').not.toContain('return=representation');
  expect(new URL(thread.url()).searchParams.get('select'), 'thread insert must not select the row back').toBeNull();
  const threadBody = thread.postDataJSON();
  expect(threadBody.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(threadBody).toMatchObject({ created_by: me, type: 'group' });

  await expect.poll(() => byTable('global_thread_participants').length).toBe(2);
  const parts = byTable('global_thread_participants').map((w) => w.postDataJSON());
  expect(parts).toHaveLength(2);
  expect(parts[0]).toEqual({ thread_id: threadBody.id, user_id: me, role: 'admin' });
  expect(parts[1]).toEqual(FAKE.map((f) => ({ thread_id: threadBody.id, user_id: f.user_id, role: 'member' })));
  expect(writes.indexOf(byTable('global_thread_participants')[0])).toBeGreaterThan(writes.indexOf(thread));

  await expect(page.getByText(/wurde erfolgreich erstellt|created successfully/).first()).toBeVisible();
  await expect(page.getByText(/Gruppe konnte nicht erstellt werden|Failed to create group/)).toHaveCount(0);
});
