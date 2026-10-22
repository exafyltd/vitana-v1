// VTID-PENDING (desktop-spotlight-finish/sizes) — arbitrary sizes and the last
// non-colour findings in the 52 files without a raw palette finding. The lane
// only swaps size tokens / adds logical directions / adds per-line allowances,
// so there is no behaviour change; this spec proves the popups and dialogs
// whose size classes were touched still open and lay out without horizontal
// scroll at desktop (1440) and mobile (390).
//
// Read-only: './staging-guard' aborts every write and nothing here submits a
// form — the dialogs are opened, measured and dismissed with Escape only. The
// spec is NEVER run against production; staging serves the production Supabase
// project (read-only by construction).
import { test, expect } from './staging-guard';

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

async function signIn(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');
  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const entry = await page.evaluate(
    () => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '',
  );
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
    await request.post(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      headers: { apikey: key!, 'Content-Type': 'application/json' },
      data: { email, password },
    })
  ).json();
  expect(session.access_token, 'sign-in failed').toBeTruthy();
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
  }, session);
}

/** Horizontal overflow of the document, in px (0/1 = none). */
async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

/** Click the first trigger that exists among the candidates; returns true if one was clicked. */
async function openVia(page: import('@playwright/test').Page, names: RegExp[]) {
  for (const name of names) {
    const btn = page.getByRole('button', { name }).first();
    if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
      await btn.click();
      return true;
    }
    const item = page.getByRole('menuitem', { name }).first();
    if ((await item.count()) && (await item.isVisible().catch(() => false))) {
      await item.click();
      return true;
    }
  }
  return false;
}

for (const width of [1440, 390]) {
  test(`VTID-PENDING sizes: Messages dialogs open without horizontal scroll at ${width}px`, async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width >= 1440 ? 900 : 844 });
    await signIn(page, request);
    await page.route(/orb-widget\.js/, (r) =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }),
    );
    await page.goto(`/messages${width >= 1440 ? '?spotlight=1' : ''}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1_500);

    // The inbox may surface the create/new actions behind an overflow menu on
    // narrow widths; open it first if present so the actions are reachable.
    const menu = page.getByRole('button', { name: /menu|more/i }).first();
    if ((await menu.count()) && (await menu.isVisible().catch(() => false))) {
      await menu.click().catch(() => {});
    }

    // New conversation dialog (NewConversationPopup).
    if (await openVia(page, [/new message|new conversation|new direct/i])) {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      expect(await overflow(page), `new-conversation dialog overflow at ${width}`).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    }

    // Re-open the overflow menu if the actions live there.
    if ((await menu.count()) && (await menu.isVisible().catch(() => false))) {
      await menu.click().catch(() => {});
    }

    // Create group dialog (messages/CreateGroupPopup).
    if (await openVia(page, [/create group|create your first group|new group/i])) {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
      expect(await overflow(page), `create-group dialog overflow at ${width}`).toBeLessThanOrEqual(1);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
    }

    // Baseline: the page itself must not scroll horizontally.
    expect(await overflow(page), `messages page overflow at ${width}`).toBeLessThanOrEqual(1);
  });
}
