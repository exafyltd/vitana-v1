// VTID-05229 — Messenger: paste a screenshot, Enter sends on desktop
// (read-only). Replaces vtid-04966-enter-newline.staging.spec.ts, whose
// touch-device assertions live on below.
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. The test user is in no legacy group and
// creating one would be a production write, so this spec answers the inbox's
// own GET reads INSIDE the browser: the real response is fetched and one
// made-up group (fake ids, fake people) is appended to it (same approach as
// VTID-04959/04966).
//   - Desktop: Shift+Enter makes a new line and sends nothing; Enter ATTEMPTS
//     the message POST, which the guard aborts — nothing is written.
//   - Paste: a synthetic paste of a PNG; the storage upload and signing calls
//     are answered inside the browser (route.fulfill), so nothing reaches
//     storage; the preview chip appears and nothing is sent.
//   - Touch: Enter adds a new line and sends nothing (VTID-04966).
import type { Page, APIRequestContext, Route } from '@playwright/test';
import { test, expect } from './staging-guard';

// Same tolerated aborts as the VTID-04966 spec. Only the desktop Enter test
// additionally tolerates the aborted message insert (it proves Enter sends):
// exactly one method on exactly one table, nowhere else in this file.
const BASE_ALLOWED =
  / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships)|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/live\/session\/prewarm)/;
const SEND_ALLOWED = new RegExp(
  `^POST https:\\/\\/inmkhvwdcuyhnxkgfvsb\\.supabase\\.co\\/rest\\/v1\\/global_messages(\\?[^ ]*)?$|${BASE_ALLOWED.source}`,
);
test.use({ allowAbortedWrites: BASE_ALLOWED });

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const DESKTOP = '(hover: hover) and (pointer: fine)';

const G = '0e5e0000-0000-4000-8000-000000005229';
const PEOPLE = [
  { user_id: '0e5e0000-0000-4000-8000-000000000c01', display_name: 'Hanna Probe' },
  { user_id: '0e5e0000-0000-4000-8000-000000000c02', display_name: 'Stefan Probe' },
  { user_id: '0e5e0000-0000-4000-8000-000000000c03', display_name: 'Mila Probe' },
];
const GROUP_NAME = 'Probe-Gruppe Einfügen';
const MESSAGE_WRITE = /\/rest\/v1\/(global_messages|messages)(\?|$)/;
// 1×1 transparent PNG.
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

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

async function addFakeGroup(page: Page, me: string) {
  const fakeIds = new Set([G, ...PEOPLE.map((p) => p.user_id)]);
  const mentionsFake = (url: string) => [...fakeIds].some((id) => url.includes(id));
  const participants = [{ user_id: me, role: 'member' }, ...PEOPLE.map((p, i) => ({ user_id: p.user_id, role: i === 0 ? 'admin' : 'member' }))].map((p, i) => ({
    id: `0e5e0000-0000-4000-8000-0000000d000${i}`, thread_id: G, ...p, is_active: true, last_read_at: null,
  }));
  const json = (route: Route, body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const realRows = async (route: Route) => {
    const res = await route.fetch();
    const body = await res.json().catch(() => []);
    return Array.isArray(body) ? body : body ? [body] : [];
  };

  await page.route(/\/rest\/v1\/(global_thread_participants|global_message_threads|global_messages|global_community_profiles|profiles)\?/, async (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fallback();
    const url = decodeURIComponent(req.url());
    const table = new URL(req.url()).pathname.split('/').pop();
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');

    if (table === 'global_thread_participants') {
      if (url.includes(`user_id=eq.${me}`) && !url.includes('thread_id=')) return json(route, [...(await realRows(route)), { thread_id: G, role: 'member', last_read_at: null }]);
      if (url.includes(G)) return json(route, [...(url.includes('thread_id=in.') ? await realRows(route) : []), ...participants]);
      return route.fallback();
    }
    if (table === 'global_message_threads' && url.includes(G)) {
      const now = new Date().toISOString();
      return json(route, [...(url.includes('id=in.') ? await realRows(route) : []), { id: G, name: GROUP_NAME, type: 'group', created_by: PEOPLE[0].user_id, created_at: now, updated_at: now }]);
    }
    if (table === 'global_messages' && url.includes(`thread_id=eq.${G}`)) return json(route, []);
    if ((table === 'global_community_profiles' || table === 'profiles') && mentionsFake(url)) {
      const fakes = PEOPLE.filter((p) => url.includes(p.user_id)).map((p) => ({ ...p, full_name: p.display_name, avatar_url: null }));
      if (single) return json(route, fakes[0] ?? null);
      return json(route, [...(url.includes('user_id=in.') ? await realRows(route) : []), ...fakes]);
    }
    return route.fallback();
  });
}

/** Signs in, opens the made-up group and returns its message box plus every message write attempted. */
async function openProbeGroup(page: Page, request: APIRequestContext) {
  const me = await signIn(page, request);
  await addFakeGroup(page, me);
  const messageWrites: string[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && MESSAGE_WRITE.test(req.url())) messageWrites.push(req.url());
  });
  await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
  await page.getByText(GROUP_NAME).first().click();
  const box = page.getByPlaceholder(new RegExp(GROUP_NAME));
  await expect(box).toBeVisible();
  await box.click();
  return { box, messageWrites };
}

test.describe('desktop keyboard — Enter', () => {
  test.use({ viewport: { width: 1440, height: 900 }, allowAbortedWrites: SEND_ALLOWED });

  test('Enter in an empty box does nothing; Shift+Enter adds a line; Enter sends', async ({ page, request }) => {
    const { box, messageWrites } = await openProbeGroup(page, request);
    expect(await page.evaluate((q) => matchMedia(q).matches, DESKTOP), 'this browser does not report a desktop pointer').toBe(true);
    await expect(box).toHaveAttribute('enterkeyhint', 'send');

    // R2.5: Enter with nothing to send adds no blank line and sends nothing.
    await box.press('Enter');
    await page.waitForTimeout(500);
    await expect(box).toHaveValue('');
    expect(messageWrites, 'Enter in an empty box tried to send').toEqual([]);

    await box.pressSequentially('Zeile eins');
    await box.press('Shift+Enter');
    await box.pressSequentially('Zeile zwei');
    await expect(box).toHaveValue('Zeile eins\nZeile zwei');
    await page.waitForTimeout(1000);
    expect(messageWrites, 'Shift+Enter tried to send the message').toEqual([]);

    // Enter sends: exactly one message POST is attempted (the guard aborts it,
    // nothing is written) and Enter adds no line. Once the aborted send has
    // settled, the box holds either nothing (cleared) or exactly the two lines
    // (restored after the failed send), never an extra newline.
    await box.press('Enter');
    await expect.poll(() => messageWrites.length, { message: 'Enter did not try to send the message' }).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    expect(messageWrites, 'one Enter sent more than once').toHaveLength(1);
    expect(['', 'Zeile eins\nZeile zwei'], 'Enter added a line to the message').toContain(await box.inputValue());
  });
});

test.describe('desktop keyboard — paste', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('pasting a screenshot attaches it without sending', async ({ page, request }) => {
    const { box, messageWrites } = await openProbeGroup(page, request);
    const storageCalls: string[] = [];
    // Answered inside the browser: nothing reaches storage.
    await page.route(/\/storage\/v1\/object\/chat-attachments\//, async (route) => {
      storageCalls.push(`${route.request().method()} upload`);
      const path = new URL(route.request().url()).pathname.split('/object/chat-attachments/')[1];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: `chat-attachments/${path}`, Id: '0e5e0000-0000-4000-8000-00000000f001' }) });
    });
    await page.route(/\/storage\/v1\/object\/sign\/chat-attachments\//, async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        storageCalls.push('POST sign');
        const path = new URL(req.url()).pathname.split('/object/sign/')[1];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signedURL: `/object/sign/${path}?token=probe` }) });
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from(PNG_B64, 'base64') });
    });

    await box.evaluate((el, b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], 'image.png', { type: 'image/png' }));
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, PNG_B64);

    await expect(page.locator('#attachment-status img[alt^="screenshot-"]'), 'the pasted screenshot has no preview').toBeVisible();
    expect(storageCalls).toEqual(['POST upload', 'POST sign']);
    await expect(box).toHaveValue('');
    await page.waitForTimeout(1000);
    expect(messageWrites, 'pasting tried to send the message').toEqual([]);
  });
});

test.describe('touch device', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Enter adds a new line and sends nothing (VTID-04966)', async ({ page, request }) => {
    const { box, messageWrites } = await openProbeGroup(page, request);
    expect(await page.evaluate((q) => matchMedia(q).matches, DESKTOP), 'a touch device reports a desktop pointer').toBe(false);

    await box.pressSequentially('Zeile eins');
    const oneLine = await box.evaluate((el) => el.clientHeight);
    await box.press('Enter');
    await box.pressSequentially('Zeile zwei');

    await expect(box).toHaveValue('Zeile eins\nZeile zwei');
    await expect.poll(() => box.evaluate((el) => el.clientHeight), { message: 'the message box did not grow for the second line' }).toBeGreaterThan(oneLine);
    await page.waitForTimeout(1500);
    expect(messageWrites, 'Enter tried to send the message').toEqual([]);
    await expect(box).toHaveAttribute('enterkeyhint', 'enter');
  });
});
