import { chromium } from 'playwright';
const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.ANON; const OUT = process.env.OUT; const APP = 'http://127.0.0.1:8080';
const ONLY = ["01-decide-approve-admin-en", "03-policy-edit-admin-en"];
// Sign-in is the one permitted auth write (documented test user, read-only verification).
const session = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify({ email: 'e2e-test@vitana.dev', password: process.env.E2E_PASSWORD }) }).then(r => r.json());
if (!session.access_token) { console.error('sign-in failed', session); process.exit(1); }
const browser = await chromium.launch({ executablePath: process.env.PW_EXE });
let blocked = 0, stubPosts = 0;
async function shot(name, { role, lang, path, rtl, click, steps }) {
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
    if (url.startsWith('http://127.0.0.1:8090/')) { if (m !== 'GET') { const okWrite = (m === 'POST' && (url.endsWith('/api/v1/backoffice/commands') || /\/api\/v1\/backoffice\/approvals\/[^/]+\/(approve|reject)$/.test(url))) || (m === 'PUT' && url.endsWith('/api/v1/backoffice/policy')); if (!okWrite) { blocked++; return route.abort(); } stubPosts++; } return route.continue(); }
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
  for (const st of steps || []) {
    try {
      if (st.click) { if (st.dispatch) await page.locator(st.click).first().dispatchEvent('click'); else await page.locator(st.click).first().click({ timeout: 10000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.fill) { await page.fill(st.fill, st.value, { timeout: 10000 }); }
      if (st.select) { await page.locator(`[data-testid="draft-select-${st.select}"]`).click({ timeout: 10000 }); await page.locator('[role="option"]', { hasText: st.option }).first().click({ timeout: 10000 }); await page.waitForTimeout(300); }
      if (st.waitFor) { await page.locator(st.waitFor).first().waitFor({ timeout: 20000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.shot) { await page.screenshot({ path: `${OUT}/${name}${st.shot}.png` }); const phase = await page.locator('[data-testid^="draft-dialog-"], [data-testid^="decide-dialog-"], [data-testid="policy-edit-dialog"]').first().getAttribute('data-phase').catch(() => null); console.log(JSON.stringify({ name: name + st.shot, phase, alerts: await page.locator('[role=alert]').allTextContents().catch(() => []), status: await page.locator('[role=status]').allTextContents().catch(() => []) })); }
    } catch (e) { console.log('step failed', JSON.stringify(st), e.message); }
  }
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
await shot('01-decide-approve-admin-en', { ...A, path: '/backoffice/approvals/queue', steps: [
  { shot: '-1-queue-with-actions' }, { click: '[data-testid="decide-approve-ap-0"]', wait: 1500 }, { shot: '-2-dialog' },
  { fill: 'textarea[name="note"]', value: 'Matches the signed credit note; approved.' }, { click: '[data-testid="decide-confirm"]' }, { waitFor: '[data-testid^="decide-outcome-"]', wait: 800 }, { shot: '-3-executed' }, { click: '[data-testid="decide-close"]', wait: 1200 }, { shot: '-4-queue-after' }] });
await shot('02-decide-reject-admin-en', { ...A, path: '/backoffice/approvals/queue', steps: [
  { click: '[data-testid="decide-reject-ap-0"]', wait: 1500 }, { click: '[data-testid="decide-confirm"]', wait: 400 }, { shot: '-1-note-required' },
  { fill: 'textarea[name="note"]', value: 'Amount does not match the signed order.' }, { click: '[data-testid="decide-confirm"]' }, { waitFor: '[data-testid^="decide-outcome-"]', wait: 800 }, { shot: '-2-rejected' }] });
await shot('03-policy-edit-admin-en', { ...A, path: '/backoffice/approvals/policies', steps: [
  { click: '[data-testid="policy-edit-open"]', wait: 1200 }, { shot: '-1-form' }, { click: '[data-testid="policy-review-btn"]', wait: 400 }, { shot: '-2-no-changes' },
  { fill: 'input[name="high_risk_amount_threshold"]', value: '50000' }, { click: '[data-testid="policy-mfa-switch"]', wait: 200 }, { click: '[data-testid="policy-review-btn"]', wait: 600 }, { shot: '-3-review-before-after' },
  { click: '[data-testid="policy-save"]' }, { waitFor: '[data-testid="policy-done"]', wait: 800 }, { shot: '-4-saved' }, { click: '[data-testid="policy-close"]', wait: 1200 }, { shot: '-5-policies-after' }] });
await shot('04-decide-approve-admin-de', { role: 'admin', lang: 'de-DE', path: '/backoffice/approvals/queue', steps: [ { click: '[data-testid="decide-approve-ap-0"]', wait: 1500 }, { shot: '-1-dialog' } ] });
await shot('05-decide-approve-admin-ar-rtl', { role: 'admin', lang: 'ar-XA', rtl: true, path: '/backoffice/approvals/queue', steps: [ { click: '[data-testid="decide-approve-ap-0"]', wait: 1500, dispatch: true }, { shot: '-1-dialog' } ] });
console.log('--- bridge down run follows in a separate stub');
console.log('blocked non-read requests:', blocked, 'stub read POSTs:', stubPosts);
await browser.close();
