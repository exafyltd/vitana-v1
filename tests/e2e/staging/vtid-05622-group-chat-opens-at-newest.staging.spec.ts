// VTID-05622 / VTID-05670 — a group chat opens with its newest message fully
// above the composer, and does not move afterwards. Read-only: './staging-guard'
// aborts every write (sign-in is the only write allowed).
//
// The group is picked read-only from the app's own group list ("Alle Beisammen"
// if the test user is in it, else any group they are already in) — the same pick
// as the VTID-04921 spec. The app's own read-receipt and viewing calls on open
// are aborted by the guard and declared below, so nothing is sent.
//
// Probe: for every animation frame in which the list is visible, record whether the
// newest message's bottom edge is hidden behind the composer ("cut") and how far that
// edge moved since the first visible frame ("movedPx").
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch|orb\/|chat\/read|chat\/viewing|chat\/groups\/[0-9a-f-]+\/read)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/object\/sign\/chat-attachments\/|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/list_my_memberships))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const GATEWAY = 'https://preview-aws-gateway.vitanaland.com';

// The group check signs in as the staging group account (an admin of staging-test-group, read-only here) when its
// secrets are set; otherwise it uses the shared test user, which is in no group and fails the check honestly.
async function signIn(page: Page, request: APIRequestContext, creds = { email: process.env.TEST_USER_EMAIL ?? '', password: process.env.TEST_USER_PASSWORD ?? '' }) {
  const { email, password } = creds;
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const bundleUrl = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
  const bundle = await (await request.get(bundleUrl)).text();
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
  return session as { access_token: string };
}

// Installed before any app script runs; samples every animation frame.
const PROBE = () => {
  type Probe = { visibleFrames: number; cutFrames: number; worstCutPx: number; firstBottom: number | null; movedPx: number };
  const w = window as unknown as { __open: Probe };
  w.__open = { visibleFrames: 0, cutFrames: 0, worstCutPx: 0, firstBottom: null, movedPx: 0 };
  const tick = () => {
    const main = document.querySelector<HTMLElement>('main[tabindex="-1"]');
    if (main && /\/inbox\/g\//.test(location.pathname) && main.style.visibility !== 'hidden' && (main.textContent ?? '').trim().length > 0) {
      const msgs = document.querySelectorAll<HTMLElement>('[id^="msg-"]');
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      const footer = document.querySelector<HTMLElement>('footer');
      if (last && footer) {
        const bottom = last.getBoundingClientRect().bottom;
        const limit = footer.getBoundingClientRect().top;
        const cut = Math.round(bottom - limit);
        w.__open.visibleFrames += 1;
        if (w.__open.firstBottom === null) w.__open.firstBottom = bottom;
        w.__open.movedPx = Math.max(w.__open.movedPx, Math.round(Math.abs(bottom - w.__open.firstBottom)));
        if (cut > 2) {
          w.__open.cutFrames += 1;
          w.__open.worstCutPx = Math.max(w.__open.worstCutPx, cut);
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

test('a group chat is first shown with its newest message fully above the composer, and does not move', async ({ page, request }) => {
  await page.addInitScript(PROBE);
  // The group pair is both-or-neither (no empty password). When set, the check runs as the staging group admin and
  // opens only staging-test-group; otherwise it falls back to the shared test user (see the pick below).
  const groupEmail = process.env.STAGING_GROUP_TEST_EMAIL ?? '';
  const groupPassword = process.env.STAGING_GROUP_TEST_PASSWORD ?? '';
  expect(!groupEmail === !groupPassword, 'STAGING_GROUP_TEST_EMAIL and STAGING_GROUP_TEST_PASSWORD must be set together').toBeTruthy();
  const groupAccount = groupEmail && groupPassword ? { email: groupEmail, password: groupPassword } : undefined;
  const session = await signIn(page, request, groupAccount);

  const groups = await request.get(`${GATEWAY}/api/v1/chat/groups/`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  expect(groups.status()).toBe(200);
  const list = ((await groups.json()).data ?? []) as Array<{ id: string; name: string }>;
  // With the group account, the group is pinned by name: a missing staging-test-group fails here, never silently
  // falls back to another group.
  const group = groupAccount
    ? list.find((g) => g.name === 'staging-test-group')
    : (list.find((g) => g.name.startsWith('Alle Beisammen')) ?? list[0]);
  expect(group, groupAccount ? 'staging-test-group is not in the group account\'s list' : 'the test user is in no group, so the opening check cannot run').toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/inbox/g/${group!.id}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[id^="msg-"]').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);

  const probe = await page.evaluate(() => (window as unknown as { __open: { visibleFrames: number; cutFrames: number; worstCutPx: number; movedPx: number } }).__open);
  expect(probe.visibleFrames, 'the group list was never shown').toBeGreaterThan(0);
  expect(probe.cutFrames, `the newest message was hidden behind the composer in ${probe.cutFrames} frame(s), worst ${probe.worstCutPx}px`).toBe(0);
  expect(probe.movedPx, `the newest message moved ${probe.movedPx}px after the list was first shown`).toBeLessThanOrEqual(4);
});
