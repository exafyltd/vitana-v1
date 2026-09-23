// VTID-04449 / VTID-04450 visual check. /api/v1/connected-apps is STUBBED
// (route.fulfill) and every non-GET request to a remote host is aborted, so
// nothing is connected, synced, imported or sent on any live system.
// Sign-in only (rule 31); Supabase reads are read-only.
const { chromium } = require('/home/user/vitana-v1/node_modules/playwright');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('/home/user/vitana-v1/.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const OUT = process.argv[2];
const IDS = ['gmail','outlook-mail','apple-mail','google-calendar','outlook-calendar','apple-calendar','google-contacts','outlook-contacts','iphone-contacts','android-contacts'];
const meta = (id) => {
  const provider = id.startsWith('g') ? 'google' : id.startsWith('outlook') ? 'microsoft' : id.startsWith('android') ? 'device' : 'apple';
  const kind = id.includes('mail') ? 'mail' : id.includes('calendar') ? 'calendar' : 'contacts';
  return { provider, kind, method: provider === 'apple' ? 'app_password' : provider === 'device' ? 'device' : 'oauth' };
};
const APPS = IDS.map((id) => ({ id, ...meta(id), availability: 'ready', status: 'off', account: null, syncs: !id.includes('mail'), last_sync_at: null, last_result: null, last_error: null }));
Object.assign(APPS.find(a=>a.id==='outlook-contacts'), { status: 'on', account: 'ana@contoso.com', last_sync_at: new Date(Date.now()-20*60000).toISOString(), last_result: { imported: 164, already_present: 3 } });
Object.assign(APPS.find(a=>a.id==='google-contacts'), { status: 'on', account: 'ana.novak@gmail.com', last_sync_at: new Date(Date.now()-3*3600000).toISOString(), last_result: { imported: 238 } });
const CONTACTS = [
  { id: 'c1', user_id: 'x', contact_name: 'Clara Weiss', contact_email: 'clara@contoso.com', contact_phone: '+49 170 555 0101', contact_user_id: null, is_on_platform: false, source: 'microsoft', created_at: '2026-09-23T10:00:00Z', updated_at: '2026-09-23T10:00:00Z' },
];
(async () => {
  const session = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers:{'Content-Type':'application/json', apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY}, body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }) }).then(r=>r.json());
  if (!session.access_token) { console.log('signin failed'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const blocked = [];
  async function run(tag, vp, lang) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w < 500, hasTouch: vp.w < 500 });
    await ctx.route('**/*', (route) => {
      const r = route.request(); const u = r.url();
      if (u.includes('/api/v1/connected-apps')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, apps: APPS }) });
      if (r.method() === 'GET' && u.includes('/rest/v1/contacts')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(CONTACTS) });
      if (u.includes('/rest/v1/rpc/get_role_preference')) return route.fulfill({ status:200, contentType:'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify([{ role: 'community' }]) });
      if (!u.startsWith('http://127.0.0.1') && r.method() !== 'GET' && !u.includes('/auth/v1/token')) {
        if (!(u.includes('/rest/v1/rpc/') && r.method() === 'POST' && /get_my|list_roles|current_/.test(u))) { blocked.push(r.method()+' '+u.split('?')[0]); return route.abort(); }
      }
      return route.continue();
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log(tag, 'PAGEERR', e.message.slice(0,160)));
    await p.goto('http://127.0.0.1:8080/');
    await p.evaluate(([s, lang]) => {
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
      localStorage.setItem('vitana::global::dev::language::selected_language', lang);
      localStorage.setItem('contact_sync_consent_' + s.user.id, 'true');
    }, [session, lang]);
    // 1) Connected Apps → contacts section with Outlook Contacts on.
    await p.goto('http://127.0.0.1:8080/connectors?tab=productivity');
    await p.waitForSelector('[data-testid="mailhub-panel"], [data-testid="mailhub-section-trigger"]', { timeout: 90000 });
    await p.waitForTimeout(2000);
    if (await p.locator('[data-testid="mailhub-panel"]').count() === 0) { await p.click('[data-testid="mailhub-section-trigger"]'); await p.waitForTimeout(600); }
    await p.locator('[data-testid="mailhub-row-outlook-contacts"]').scrollIntoViewIfNeeded();
    await p.getByText('ana@contoso.com').first().waitFor({ timeout: 30000 }).catch((e) => console.log(tag, 'hub state not shown:', e.message.split('\n')[0]));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${tag}-1-outlook-contacts-row.png` });
    // 2) Apple dialog with the rewritten privacy line (VTID-04450).
    await p.click('[data-testid="mailhub-toggle-apple-mail"]'); await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${tag}-2-apple-dialog.png` });
    console.log(tag, 'hscroll connectors', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    // 3) Find friends: four sources, Outlook marked on.
    await p.goto('http://127.0.0.1:8080/inbox'); await p.waitForTimeout(6000);
    await p.click(vp.w < 500 ? '[data-testid="inbox-filter-contacts"]' : 'button[role="tab"][id$="-trigger-contacts"]');
    await p.waitForTimeout(1500);
    await p.click('[data-testid="find-friends-button"]'); await p.waitForTimeout(1500);
    if (await p.locator('[data-testid="find-friends-consent-continue"]').count()) { await p.click('[data-testid="find-friends-consent-continue"]'); await p.waitForTimeout(1000); }
    await p.screenshot({ path: `${OUT}/${tag}-3-find-friends-sources.png` });
    console.log(tag, 'hscroll inbox', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    await ctx.close();
  }
  await run('mobile-de', { w: 390, h: 844 }, 'de-DE');
  await run('desktop-en', { w: 1400, h: 900 }, 'en-US');
  await run('mobile-ar', { w: 390, h: 844 }, 'ar-XA');
  await browser.close();
  console.log('blocked remote writes:', [...new Set(blocked)].slice(0, 15).join('\n') || 'none');
})();
