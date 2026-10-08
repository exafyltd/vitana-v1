// VTID-04955 — the group-name field is reachable and editable on a phone, the
// typed name is what gets saved, and no email shows in the dialog or in the
// "created the group" notice (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. This spec writes NOTHING: the directory
// lookup (a SELECT sent as POST) returns two made-up people, and the group
// writes are recorded and answered 201 inside the browser — the guard's rules
// are not widened. Rename and remove-member are writes: they are covered by
// Vitest (groupManagement, GroupMembersModal) and SQL-GROUP-PARTICIPANTS.
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

test('group name: reachable and focused on a phone, typed name saved, no emails shown or stored', async ({ page, request }) => {
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

  for (const person of FAKE) {
    await dialog.locator('#search').fill('Test Person');
    await dialog.locator('#search').press('Enter');
    const row = dialog.locator('div.border', { hasText: person.display_name });
    await expect(row).toBeVisible();
    // Search results show names, never email addresses.
    await expect(row).not.toContainText('@');
    await row.getByRole('button', { name: /^(Hinzufügen|Add)$/ }).click();
  }

  // The dialog fits the phone (scrolls inside itself instead of overflowing).
  const box = await dialog.boundingBox();
  expect(box, 'dialog has no box').toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 1);

  // Group mode: the prefilled name field is focused and on screen.
  const nameInput = dialog.locator('#groupName');
  await expect(nameInput).not.toHaveValue('');
  await expect(nameInput).toBeFocused();
  await expect(nameInput).toBeInViewport();

  await nameInput.fill('Lauftreff Staging');
  await dialog.getByRole('button', { name: /^(Gruppe erstellen|Create Group)$/ }).click();

  const byTable = (t: string) => writes.filter((w) => new URL(w.url()).pathname.endsWith(`/${t}`));
  await expect.poll(() => byTable('global_messages').length, { message: 'no notice write' }).toBe(1);
  const [thread] = byTable('global_message_threads');
  expect(thread.postDataJSON()).toMatchObject({ created_by: me, type: 'group', name: 'Lauftreff Staging' });

  // The notice stores a display name, never the creator's email.
  const notice = byTable('global_messages')[0].postDataJSON();
  expect(notice.content_data).toMatchObject({ system_type: 'group_created', group_name: 'Lauftreff Staging' });
  expect(JSON.stringify(notice)).not.toContain('@');
});
