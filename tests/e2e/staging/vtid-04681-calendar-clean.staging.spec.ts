// VTID-04680/04681/04682 — the calendar on staging is clean and calm.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write.
// Signs in as the documented test user (the sign-in token call is the only
// write the guard allows), opens /calendar and checks:
//   - today's date leads the screen;
//   - no text on the page is heavier than medium (500);
//   - the calendar never asks for staff work items and shows none;
//   - connecting Google / Apple / Outlook is on the screen (the connect card
//     while nothing is connected, else the Calendars section).
import { test, expect } from './staging-guard';

test.use({
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log))/,
});

const SUPABASE = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';

test('the calendar opens on a large date, calm type, no work items, connect on screen', async ({ page, request }) => {
  const email = process.env.TEST_USER_EMAIL ?? '';
  const password = process.env.TEST_USER_PASSWORD ?? '';
  test.skip(!email || !password, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not provided');

  await page.goto('/maxina', { waitUntil: 'domcontentloaded' });
  const anon = await page.evaluate(() => {
    const s = [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-'));
    return s ?? '';
  });
  const bundle = await (await request.get(anon)).text();
  // The anon key is the JWT in the bundle whose payload names this project and role anon.
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

  const windowCalls: string[] = [];
  const workIds: string[] = [];
  page.on('response', async (r) => {
    if (!r.url().includes('/api/v1/calendar/events/window')) return;
    windowCalls.push(r.url());
    const body = await r.json().catch(() => null);
    for (const d of body?.data ?? []) if (String(d.id).startsWith('work:')) workIds.push(d.id);
  });

  await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
  const date = page.getByTestId('vcal-date');
  await expect(date).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('vcal-summary')).toBeVisible({ timeout: 45_000 });
  expect((await date.innerText()).trim()).toMatch(new RegExp(`^${new Date().getDate()}\\b`));

  const heavy = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="vcal-page"]')!;
    const out: string[] = [];
    root.querySelectorAll('*').forEach((el) => {
      if (el.children.length === 0 && el.textContent?.trim() && Number(getComputedStyle(el).fontWeight) > 500) out.push(el.textContent.trim().slice(0, 40));
    });
    return out;
  });
  expect(heavy, `text heavier than medium: ${heavy.join(' | ')}`).toEqual([]);

  await expect.poll(() => windowCalls.length, { timeout: 20_000 }).toBeGreaterThan(0);
  expect(windowCalls.filter((u) => u.includes('include_work=true'))).toEqual([]);
  expect(workIds).toEqual([]);

  await expect(page.getByTestId('vcal-connect').or(page.getByTestId('vcal-section-calendars'))).toBeVisible({ timeout: 20_000 });
});
