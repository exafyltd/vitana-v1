// VTID-05138 — a picture in a chat shows as a picture and opens full screen
// (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Nothing is sent: the spec opens the
// fixture group on a phone viewport. The test account is in no real group
// (platform rule 43: test accounts never sit in real members' rosters), so the
// group, its roster and its messages are answered inside the browser
// (page.route), and so are the signed-URL POSTs for chat attachments
// (`/storage/v1/object/sign/chat-attachments/…`, a local signed path whose GET
// gets a tiny local PNG). No request with a body ever leaves the browser.
// The fixture picture must render as an <img> (not the file chip), and
// tapping it opens the full-screen viewer,
// which Esc closes. Forward from the viewer opens the forward sheet ON TOP of
// the viewer with the "share via other apps" button (A1); the spec never taps
// send or share — opening the sheet only reads the chat list (GETs). Esc
// closes the sheet back to the picture. Copy, forward-send, share and download
// are proven in Vitest.
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/chat\/groups\/[0-9a-f-]+\/read|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/rpc\/get_message_reactions_text)/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';
const FIXTURE_ID = '00000000-0000-4000-8000-000005138000';
const GROUP_ID = '00000000-0000-4000-8000-000005138001';
const SENDER_ID = '00000000-0000-4000-8000-000005138002';
const FIXTURE_NAME = 'vtid-05138-fixture.png';
// 8×8 opaque PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNwaDiAFTEMLQkAYvNgAXSglMMAAAAASUVORK5CYII=',
  'base64',
);

test('a chat picture renders inline and opens the full-screen viewer', async ({ page, request }) => {
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

  const now = new Date().toISOString();
  const group = {
    id: GROUP_ID,
    tenant_id: '',
    name: 'VTID-05138 fixture',
    description: null,
    is_system: false,
    metadata: {},
    created_at: now,
    role: 'member',
    joined_at: now,
    last_read_at: now,
    last_message: null,
    unread_count: 0,
  };
  const members = [
    { user_id: session.user?.id ?? '', role: 'member', joined_at: now, display_name: null, avatar_url: null },
    { user_id: SENDER_ID, role: 'member', joined_at: now, display_name: 'Fixture', avatar_url: null },
  ];

  // Signed URLs for chat attachments: answered locally, never sent.
  await page.route(`${SUPABASE}/storage/v1/object/sign/chat-attachments/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      return route.fulfill({ json: { signedURL: `/object/sign/chat-attachments/vtid-05138/${FIXTURE_NAME}?token=local` } });
    }
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });

  // The fixture group: the group list gets it added, and its detail and
  // messages (all GETs) are answered locally with one picture message.
  const fixture = {
    id: FIXTURE_ID,
    tenant_id: '',
    sender_id: SENDER_ID,
    group_id: GROUP_ID,
    content: '',
    created_at: now,
    message_type: 'attachment',
    metadata: {
      attachments: [
        { type: 'file', mime: '', path: `${SENDER_ID}/${GROUP_ID}/${FIXTURE_NAME}`, url: `${SUPABASE}/storage/v1/object/sign/chat-attachments/expired`, filename: FIXTURE_NAME, name: FIXTURE_NAME, size: 314650 },
      ],
    },
  };
  await page.route(`${GATEWAY}/api/v1/chat/groups**`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const path = new URL(route.request().url()).pathname.replace(/\/+$/, '');
    // Every answer is built on the real staging GET (read-only) so it keeps the
    // gateway's CORS headers; a bare fulfilled body is rejected cross-origin.
    if (path === '/api/v1/chat/groups') {
      const res = await route.fetch();
      const json = await res.json().catch(() => ({}));
      return route.fulfill({ response: res, status: 200, json: { ...json, ok: true, data: [group, ...(json.data ?? [])] } });
    }
    if (path === `/api/v1/chat/groups/${GROUP_ID}`) {
      const res = await route.fetch();
      return route.fulfill({ response: res, status: 200, json: { ok: true, data: { ...group, members, member_count: members.length } } });
    }
    if (path === `/api/v1/chat/groups/${GROUP_ID}/messages`) {
      const res = await route.fetch();
      return route.fulfill({ response: res, status: 200, json: { ok: true, data: [fixture] } });
    }
    return route.fallback();
  });

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  // Diagnostics for a failure: what the group requests got, and what the page shows.
  const trace: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/chat/groups')) trace.push(`${r.request().method()} ${new URL(r.url()).pathname} -> ${r.status()}`);
  });
  page.on('requestfailed', (r) => {
    if (r.url().includes('/chat/groups')) trace.push(`FAILED ${r.request().method()} ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/g/${GROUP_ID}`, { waitUntil: 'domcontentloaded' });

  const fixtureMsg = page.locator(`#msg-${FIXTURE_ID}`);
  const picture = fixtureMsg.locator(`[data-testid="chat-image-attachment"] img[alt="${FIXTURE_NAME}"]`);
  try {
    await expect(picture).toBeVisible({ timeout: 20_000 });
  } catch (err) {
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    throw new Error(`fixture picture not shown; group requests: ${trace.join(' | ') || 'none'}; page: ${text}` + ` (${String(err).slice(0, 120)})`);
  }
  await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 10_000 }).toBe(true);
  await expect(fixtureMsg.locator('[data-testid="chat-file-chip"]')).toHaveCount(0);

  // Click the attachment itself (the element that owns the click). The hover
  // toolbar no longer takes pointer events until hovered (VTID-05138 fix-forward 3).
  await fixtureMsg.locator('[data-testid="chat-image-attachment"]').click();
  const viewer = page.getByTestId('chat-image-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.getByTestId('chat-image-viewer-image')).toHaveAttribute('alt', FIXTURE_NAME);
  await expect(viewer.getByTestId('chat-image-viewer-download')).toBeVisible();
  await expect(viewer.getByTestId('chat-image-viewer-copy')).toBeVisible();
  await expect(viewer.getByTestId('chat-image-viewer-forward')).toBeVisible();

  // A1: Forward keeps the picture open and shows the sheet above it.
  await viewer.getByTestId('chat-image-viewer-forward').click();
  const sheet = page.getByTestId('forward-message-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute('data-above-viewer', 'true');
  await expect(sheet.getByTestId('forward-share-other')).toBeVisible();
  await expect(sheet.getByTestId('forward-target-list')).toBeVisible();
  await expect(viewer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(viewer).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/inbox/g/${GROUP_ID}`));
});
