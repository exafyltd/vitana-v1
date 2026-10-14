// VTID-05138 — a picture in a chat shows as a picture and opens full screen
// (read-only).
//
// './staging-guard' (copied in by the runner) aborts every write; the sign-in
// token call is the only one allowed. Nothing is sent: the spec opens the
// "Alle Beisammen" group on a phone viewport and answers two kinds of request
// inside the browser (page.route), so no request with a body ever leaves it:
//   - the signed-URL POSTs for chat attachments (`/storage/v1/object/sign/chat-attachments/…`)
//     get a local signed path, and that path's GET gets a tiny local PNG;
//   - the group's message list (a GET) is read from staging as usual, and one
//     fixture picture message is added on top of it in the browser.
// The fixture picture must render as an <img> (not the file chip), every
// other picture in the list too, and tapping it opens the full-screen viewer,
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
const FIXTURE_NAME = 'vtid-05138-fixture.png';
// 8×8 opaque PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNwaDiAFTEMLQkAYvNgAXSglMMAAAAASUVORK5CYII=',
  'base64',
);
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|heic|heif|bmp|tiff?|avif)$/i;

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

  const groups = await request.get(`${GATEWAY}/api/v1/chat/groups/`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(groups.status()).toBe(200);
  const list = ((await groups.json()).data ?? []) as Array<{ id: string; name: string }>;
  const alle = list.find((g) => g.name.startsWith('Alle Beisammen'));
  expect(alle, 'test user is not in Alle Beisammen').toBeTruthy();

  // Signed URLs for chat attachments: answered locally, never sent.
  await page.route(`${SUPABASE}/storage/v1/object/sign/chat-attachments/**`, async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      return route.fulfill({ json: { signedURL: `/object/sign/chat-attachments/vtid-05138/${FIXTURE_NAME}?token=local` } });
    }
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });

  // The group's messages (a GET) plus one fixture picture message on top.
  await page.route(`${GATEWAY}/api/v1/chat/groups/${alle!.id}/messages**`, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const res = await route.fetch();
    const json = await res.json();
    const fixture = {
      id: FIXTURE_ID,
      tenant_id: '',
      sender_id: '00000000-0000-4000-8000-000000000000',
      group_id: alle!.id,
      content: '',
      created_at: new Date().toISOString(),
      message_type: 'attachment',
      metadata: {
        attachments: [
          { type: 'file', mime: '', path: `vtid-05138/${alle!.id}/${FIXTURE_NAME}`, url: `${SUPABASE}/storage/v1/object/sign/chat-attachments/expired`, filename: FIXTURE_NAME, name: FIXTURE_NAME, size: 314650 },
        ],
      },
    };
    return route.fulfill({ response: res, json: { ...json, data: [fixture, ...(json.data ?? [])] } });
  });

  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/g/${alle!.id}`, { waitUntil: 'domcontentloaded' });

  const fixtureMsg = page.locator(`#msg-${FIXTURE_ID}`);
  const picture = fixtureMsg.locator(`[data-testid="chat-image-attachment"] img[alt="${FIXTURE_NAME}"]`);
  await expect(picture).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 10_000 }).toBe(true);
  await expect(fixtureMsg.locator('[data-testid="chat-file-chip"]')).toHaveCount(0);

  // No picture anywhere in the list fell back to the file chip.
  const chipNames = await page.locator('[data-testid="chat-file-chip"] p.truncate').allTextContents();
  expect(chipNames.filter((n) => IMAGE_EXT.test(n.trim())), 'a picture fell back to the file chip').toEqual([]);

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
  await expect(page).toHaveURL(new RegExp(`/inbox/g/${alle!.id}`));
});
