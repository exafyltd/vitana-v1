import { chromium } from 'playwright';
const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.ANON; const OUT = process.env.OUT; const APP = 'http://127.0.0.1:8080';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
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
  for (const st of steps || []) {
    try {
      if (st.click) { if (st.dispatch) await page.locator(st.click).first().dispatchEvent('click'); else await page.locator(st.click).first().click({ timeout: 10000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.fill) { await page.fill(st.fill, st.value, { timeout: 10000 }); }
      if (st.select) { await page.locator(`[data-testid="draft-select-${st.select}"]`).click({ timeout: 10000 }); await page.locator('[role="option"]', { hasText: st.option }).first().click({ timeout: 10000 }); await page.waitForTimeout(300); }
      if (st.waitFor) { await page.locator(st.waitFor).first().waitFor({ timeout: 20000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.shot) { await page.screenshot({ path: `${OUT}/${name}${st.shot}.png` }); const phase = await page.locator('[data-testid^="draft-dialog-"]').first().getAttribute('data-phase').catch(() => null); console.log(JSON.stringify({ name: name + st.shot, phase, alerts: await page.locator('[role=alert]').allTextContents().catch(() => []), status: await page.locator('[role=status]').allTextContents().catch(() => []) })); }
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
const M = { role: 'backoffice', lang: 'en-US' };
await shot('01-draft-customer-salesmanager-en', { ...M, path: '/backoffice/sales/contacts', steps: [
  { click: '[data-testid="draft-open-customer"]', wait: 800 }, { shot: '-1-form-empty' },
  { fill: 'input[name="name"]', value: 'Gulf Wellness Trading FZE' }, { select: 'customer_type', option: 'Company' }, { fill: 'input[name="tax_id"]', value: '100123456700003' }, { fill: 'input[name="credit_limit"]', value: '25000' }, { fill: 'textarea[name="primary_address"]', value: 'Al Maryah Island, Abu Dhabi' }, { shot: '-2-form-filled' },
  { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-3-review-card' }, { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-4-done' }] });
await shot('02-draft-credit-note-salesmanager-en', { ...M, path: '/backoffice/sales/invoices', steps: [
  { click: 'table tbody tr', wait: 1500 }, { waitFor: '[data-testid="draft-open-creditNote"]' }, { shot: '-1-posted-invoice-detail' },
  { click: '[data-testid="draft-open-creditNote"]', wait: 800 }, { shot: '-2-form-lines' },
  { click: '[data-testid="draft-review"]', wait: 400 }, { shot: '-3-validation-no-lines' },
  { fill: 'input[name="items.0.qty"]', value: '25' }, { click: '[data-testid="draft-review"]', wait: 400 }, { shot: '-4-validation-qty-too-high' },
  { fill: 'input[name="items.0.qty"]', value: '2' }, { fill: 'input[name="reason"]', value: 'Two seats cancelled before the programme started' },
  { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-5-review-card' }, { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-6-done' }] });
await shot('03-draft-customer-salesmanager-de', { role: 'backoffice', lang: 'de-DE', path: '/backoffice/sales/contacts', steps: [
  { click: '[data-testid="draft-open-customer"]', wait: 800 }, { fill: 'input[name="name"]', value: 'Gulf Wellness Trading FZE' }, { fill: 'input[name="credit_limit"]', value: '25000' }, { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-1-review-card' }] });
await shot('04-draft-credit-note-salesmanager-ar-rtl', { role: 'backoffice', lang: 'ar-XA', rtl: true, path: '/backoffice/sales/invoices', steps: [
  { click: 'table tbody tr', wait: 1500, dispatch: true }, { waitFor: '[data-testid="draft-open-creditNote"]' }, { click: '[data-testid="draft-open-creditNote"]', wait: 800, dispatch: true }, { fill: 'input[name="items.0.qty"]', value: '2' }, { shot: '-1-form-lines' }] });
await shot('05-draft-no-buttons-draft-invoice-salesmanager-en', { ...M, path: '/backoffice/sales/invoices', steps: [ { click: 'table tbody tr:nth-child(2)', wait: 1500 }, { shot: '-1-draft-invoice-no-credit-note-button' } ] });
console.log('--- bridge down run follows in a separate stub');
console.log('blocked non-read requests:', blocked, 'stub read POSTs:', stubPosts);
await browser.close();
