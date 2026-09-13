import { chromium } from 'playwright';
const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.ANON; const OUT = process.env.OUT; const APP = 'http://127.0.0.1:8080';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
// Sign-in is the one permitted auth write (documented test user, read-only verification).
const session = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify({ email: 'e2e-test@vitana.dev', password: 'VitanaE2eTest2026!' }) }).then(r => r.json());
if (!session.access_token) { console.error('sign-in failed', session); process.exit(1); }
const browser = await chromium.launch({ executablePath: process.env.PW_EXE });
let blocked = 0, stubPosts = 0;
async function shot(name, { role, lang, path, rtl, click }) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: rtl ? 'ar-AE' : lang, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  // SAFETY NET: no write can leave this browser. Only GETs, read-style RPCs and the local stub's typed Read commands pass.
  await page.route('**/*', async (route) => {
    const req = route.request(); const url = req.url(); const m = req.method();
    // Supabase auth calls hang in this sandbox (no proxy trust in Chromium) and hold the auth lock, so getSession() never
    // resolves and no gateway call is ever made. Serve the already-signed-in session/user locally instead — still no write.
    if (url.includes('/auth/v1/user') && m === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) });
    if (url.includes('/auth/v1/token')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session) });
    if (url.includes('/rest/v1/rpc/get_role_preference')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ role }]) });
    if (url.includes('/rest/v1/rpc/get_my_permitted_roles')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, roles: ['community', role], is_super_admin: false }) });
    if (url.startsWith('http://127.0.0.1:8090/')) { if (m === 'POST') { if (!url.endsWith('/api/v1/backoffice/commands')) { blocked++; return route.abort(); } stubPosts++; } return route.continue(); }
    if (url.includes('supabase.co') || url.includes('vitanaland.com') || url.includes('/api/v1/')) {
      const readRpc = /\/rest\/v1\/rpc\/(get_|list_|current_|check_|search_|fetch_|is_|has_)/.test(url);
      if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS' && !readRpc && !url.includes('/auth/v1/')) { blocked++; return route.abort(); }
    }
    return route.continue();
  });
  await page.goto(`${APP}/auth`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ s, lang }) => { localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s)); localStorage.setItem('vitana.authToken', s.access_token); localStorage.setItem('vitana.viewRole', 'community'); localStorage.setItem('vitana.lang', lang); localStorage.setItem('vitana::global::dev::language::selected_language', lang); }, { s: session, lang });
  await page.goto(`${APP}${path}`, { waitUntil: 'domcontentloaded' });
  // content-based wait: the app hard-reloads after auth hydration; then wait for every skeleton to settle
  const mounted = await page.locator('[data-screen-id]').first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => document.querySelectorAll('[aria-busy="true"]').length === 0, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  if (click) { await page.locator(click).first().click().catch(e => console.log('click failed', e.message)); await page.waitForTimeout(800); }
  const dir = await page.evaluate(() => document.documentElement.dir || 'ltr');
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  const screenId = await page.locator('[data-screen-id]').first().getAttribute('data-screen-id').catch(() => null);
  const rows = await page.locator('table tbody tr').count().catch(() => 0);
  const alerts = await page.locator('[role=alert]').allTextContents().catch(() => []);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(JSON.stringify({ name, mounted, url: page.url().replace(APP, ''), dir, screenId, h1: h1?.trim(), rows, alerts, hOverflow: overflow }));
  await ctx.close();
}
const A = { role: 'admin', lang: 'en-US' };
await shot('01-dashboard-admin-en', { ...A, path: '/backoffice/dashboard' });
await shot('02-inbox-admin-en', { ...A, path: '/backoffice/inbox' });
await shot('03-activity-admin-en', { ...A, path: '/backoffice/activity' });
await shot('04-health-admin-en', { ...A, path: '/backoffice/health' });
await shot('05-approvals-queue-admin-en', { ...A, path: '/backoffice/approvals/queue' });
await shot('06-my-requests-admin-en', { ...A, path: '/backoffice/approvals/my-requests' });
await shot('07-policies-admin-en', { ...A, path: '/backoffice/approvals/policies' });
await shot('08-audit-receipts-open-admin-en', { ...A, path: '/backoffice/audit/receipts', click: 'table button[aria-expanded="false"]' });
await shot('09-audit-erp-log-admin-en', { ...A, path: '/backoffice/audit/erp-log' });
await shot('10-audit-trail-admin-en', { ...A, path: '/backoffice/audit/trail' });
await shot('11-settings-company-admin-en', { ...A, path: '/backoffice/settings/company' });
await shot('12-dashboard-admin-de', { role: 'admin', lang: 'de-DE', path: '/backoffice/dashboard' });
await shot('13-settings-company-admin-ar-rtl', { role: 'admin', lang: 'ar-XA', path: '/backoffice/settings/company', rtl: true });
await shot('14-approvals-queue-admin-ar-rtl', { role: 'admin', lang: 'ar-XA', path: '/backoffice/approvals/queue', rtl: true });
await shot('15-health-bookkeeper-no-access-en', { role: 'backoffice', lang: 'en-US', path: '/backoffice/health' });
await shot('16-company-bookkeeper-accounting-view-en', { role: 'backoffice', lang: 'en-US', path: '/backoffice/settings/company' });
await shot('17-health-bridge-down-admin-en', { ...A, path: '/backoffice/health' });
console.log('blocked non-read requests:', blocked, 'stub read POSTs:', stubPosts);
await browser.close();
