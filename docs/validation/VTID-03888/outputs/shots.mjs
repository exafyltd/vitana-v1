import { chromium } from 'playwright';
const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON = process.env.ANON; const OUT = process.env.OUT; const APP = 'http://127.0.0.1:8080';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
// Sign-in is the one permitted auth write (documented test user, read-only verification).
const session = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON }, body: JSON.stringify({ email: 'e2e-test@vitana.dev', password: 'VitanaE2eTest2026!' }) }).then(r => r.json());
if (!session.access_token) { console.error('sign-in failed', session); process.exit(1); }
const browser = await chromium.launch({ executablePath: process.env.PW_EXE });
let blocked = 0, stubPosts = 0;
async function shot(name, { role, lang, path, rtl, mobile, steps }) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1400, height: 900 }, locale: rtl ? 'ar-AE' : lang, serviceWorkers: 'block', isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  // SAFETY NET: no write can leave this browser. Only GETs, read-style RPCs and the local stub's typed commands pass.
  await page.route('**/*', async (route) => {
    const req = route.request(); const url = req.url(); const m = req.method();
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
  const mounted = await page.locator('[data-screen-id]').first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => document.querySelectorAll('[aria-busy="true"]').length === 0, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const phaseOf = async () => page.locator('[data-testid^="draft-dialog-"], [data-testid^="decide-dialog-"]').first().getAttribute('data-phase').catch(() => null);
  for (const st of steps || []) {
    try {
      if (st.click) { if (st.dispatch) await page.locator(st.click).first().dispatchEvent('click'); else await page.locator(st.click).first().click({ timeout: 10000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.clickRow) { await page.locator('table tbody tr', { hasText: st.clickRow }).first().click({ timeout: 10000 }); await page.waitForTimeout(st.wait ?? 1200); }
      if (st.fill) { await page.fill(st.fill, st.value, { timeout: 10000 }); }
      if (st.select) { await page.locator(`[data-testid="draft-select-${st.select}"]`).click({ timeout: 10000 }); await page.locator('[role="option"]', { hasText: st.option }).first().click({ timeout: 10000 }); await page.waitForTimeout(300); }
      if (st.waitFor) { await page.locator(st.waitFor).first().waitFor({ timeout: 20000 }); await page.waitForTimeout(st.wait ?? 500); }
      if (st.expectDisabled) { const dis = await page.locator(st.expectDisabled).first().isDisabled().catch(() => null); console.log(JSON.stringify({ name, check: 'disabled', sel: st.expectDisabled, disabled: dis })); }
      if (st.shot) { await page.screenshot({ path: `${OUT}/${name}${st.shot}.png` }); console.log(JSON.stringify({ name: name + st.shot, phase: await phaseOf(), alerts: await page.locator('[role=alert]').allTextContents().catch(() => []), status: await page.locator('[role=status]').allTextContents().catch(() => []), accept: await page.locator('[data-testid="draft-accept"]').first().isDisabled().catch(() => null) })); }
    } catch (e) { console.log('step failed', JSON.stringify(st), e.message); }
  }
  const dir = await page.evaluate(() => document.documentElement.dir || 'ltr');
  const screenId = await page.locator('[data-screen-id]').first().getAttribute('data-screen-id').catch(() => null);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(JSON.stringify({ name, mounted, url: page.url().replace(APP, ''), dir, screenId, hOverflow: overflow }));
  await ctx.close();
}
const M = { role: 'admin', lang: 'en-US' };
const LEADS = '/backoffice/sales/leads', OPPS = '/backoffice/sales/opportunities', INV = '/backoffice/sales/invoices', JOUR = '/backoffice/accounting/journals', QUEUE = '/backoffice/approvals/queue';

await shot('01-convert-lead-en', { ...M, path: LEADS, steps: [
  { clickRow: 'Omar Saleh' }, { shot: '-1-detail-actions' },
  { click: '[data-testid="draft-open-leadConvert"]', wait: 1200 }, { shot: '-2-form-prefilled' },
  { fill: 'input[name="expected_revenue"]', value: '48000' },
  { click: '[data-testid="draft-review"]', wait: 600 }, { expectDisabled: '[data-testid="draft-accept"]' }, { shot: '-3-review-unconfirmed' },
  { click: '[data-testid="draft-confirm"]', wait: 300 }, { shot: '-4-review-confirmed' },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-5-executed' } ] });

await shot('02-mark-won-en', { ...M, path: OPPS, steps: [
  { shot: '-1-board-actions' },
  { click: '[data-testid="draft-open-opportunityWon"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { click: '[data-testid="draft-confirm"]', wait: 300 }, { shot: '-2-review-confirmed' },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-3-executed' } ] });

await shot('03-mark-lost-en', { ...M, path: OPPS, steps: [
  { click: '[data-testid="draft-open-opportunityLost"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-1-reason-required' },
  { fill: 'textarea[name="lost_reason"]', value: 'Chose a competitor on price' },
  { click: '[data-testid="draft-review"]', wait: 600 }, { click: '[data-testid="draft-confirm"]', wait: 300 }, { shot: '-2-review-confirmed' },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-3-executed' } ] });

await shot('04-post-invoice-en', { ...M, path: INV, steps: [
  { clickRow: 'INV-2026-00001' }, { shot: '-1-draft-detail-actions' },
  { click: '[data-testid="draft-open-invoiceSubmit"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-2-review-unconfirmed' },
  { click: '[data-testid="draft-confirm"]', wait: 300 },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-done"]', wait: 800 }, { shot: '-3-posted' } ] });

await shot('05-cancel-invoice-high-en', { ...M, path: INV, steps: [
  { clickRow: 'INV-2026-00002' }, { shot: '-1-posted-detail-actions' },
  { click: '[data-testid="draft-open-invoiceCancel"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { expectDisabled: '[data-testid="draft-accept"]' }, { shot: '-2-review-high-unconfirmed' },
  { click: '[data-testid="draft-confirm"]', wait: 300 }, { shot: '-3-review-high-confirmed' },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-queued"]', wait: 800 }, { shot: '-4-queued' } ] });

await shot('06-post-journal-fails-en', { ...M, path: JOUR, steps: [
  { clickRow: 'JE-2026-00081' }, { shot: '-1-draft-detail-actions' },
  { click: '[data-testid="draft-open-journalSubmit"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { click: '[data-testid="draft-confirm"]', wait: 300 },
  { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-failed"]', wait: 800 }, { shot: '-2-erp-refused' } ] });

await shot('07-approver-sees-payload-en', { ...M, path: QUEUE, steps: [
  { click: '[data-testid^="decide-approve-"], button:has-text("Approve")', wait: 1200 }, { shot: '-1-decide-with-payload' } ] });

await shot('08-cancel-invoice-de-mobile', { role: 'admin', lang: 'de-DE', mobile: true, path: INV, steps: [
  { clickRow: 'INV-2026-00002' },
  { click: '[data-testid="draft-open-invoiceCancel"]', wait: 1200 },
  { click: '[data-testid="draft-review"]', wait: 600 }, { shot: '-1-review-mobile' },
  { click: '[data-testid="draft-confirm"]', wait: 300 }, { click: '[data-testid="draft-accept"]' }, { waitFor: '[data-testid="draft-queued"]', wait: 800 }, { shot: '-2-queued-mobile' } ] });

await shot('09-convert-lead-ar-rtl', { role: 'admin', lang: 'ar-XA', rtl: true, path: LEADS, steps: [
  { clickRow: 'Omar Saleh', dispatch: true },
  { click: '[data-testid="draft-open-leadConvert"]', wait: 1200, dispatch: true },
  { click: '[data-testid="draft-review"]', wait: 600, dispatch: true }, { shot: '-1-review-rtl' } ] });

console.log('blocked non-read requests:', blocked, 'stub POSTs:', stubPosts);
await browser.close();
