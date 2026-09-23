// VTID-04406 app visual check: Mail, Calendar & Contacts on /connectors.
// /api/v1/connected-apps is STUBBED locally (route.fulfill) — no app is
// connected, disconnected or synced on any live system. Every other
// non-GET request to a remote host is aborted. Sign-in only (rule 31).
const { chromium } = require('/home/user/vitana-v1/node_modules/playwright');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('/home/user/vitana-v1/.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const OUT = process.argv[2];
const IDS = ['gmail','outlook-mail','apple-mail','google-calendar','outlook-calendar','apple-calendar','google-contacts','iphone-contacts','android-contacts'];
const meta = (id) => {
  const provider = id.startsWith('g') ? 'google' : id.startsWith('outlook') ? 'microsoft' : id.startsWith('android') ? 'device' : 'apple';
  const kind = id.includes('mail') ? 'mail' : id.includes('calendar') ? 'calendar' : 'contacts';
  return { provider, kind, method: provider === 'apple' ? 'app_password' : provider === 'device' ? 'device' : 'oauth' };
};
function initialState() {
  const s = {};
  for (const id of IDS) s[id] = { id, ...meta(id), availability: 'ready', status: 'off', account: null, syncs: !id.includes('mail'), last_sync_at: null, last_result: null, last_error: null };
  Object.assign(s['gmail'], { status: 'on', account: 'ana.novak@gmail.com' });
  Object.assign(s['google-calendar'], { status: 'on', account: 'ana.novak@gmail.com', last_sync_at: new Date(Date.now()-6*60000).toISOString(), last_result: { busy: 14 } });
  Object.assign(s['google-contacts'], { status: 'on', account: 'ana.novak@gmail.com', last_sync_at: new Date(Date.now()-3*3600000).toISOString(), last_result: { imported: 238 } });
  Object.assign(s['outlook-calendar'], { status: 'needs_reconnect', account: 'ana@contoso.com' });
  return s;
}
(async () => {
  const session = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers:{'Content-Type':'application/json', apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY}, body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }) }).then(r=>r.json());
  if (!session.access_token) { console.log('signin failed'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const blocked = []; const hubCalls = [];
  async function run(name, vp, steps, lang) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w<500, hasTouch: vp.w<500 });
    const st = initialState();
    await ctx.route('**/*', (route) => {
      const r = route.request(); const u = r.url();
      if (u.includes('/api/v1/connected-apps')) {
        hubCalls.push(r.method()+' '+u.split('/api/v1/connected-apps')[1]);
        const m = u.match(/connected-apps\/([^/?]+)\/(connect|disconnect|sync)/);
        if (m) {
          const [, id, act] = m;
          if (act === 'connect') {
            const body = JSON.parse(r.postData() || '{}');
            if (id === 'outlook-mail') return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, status:'consent_required', auth_url:'http://127.0.0.1:8080/__consent_stub' }) });
            if (st[id].provider === 'apple' && body.app_password !== 'abcd-efgh-ijkl-mnop' && !Object.values(st).some(a => a.provider==='apple' && a.status==='on')) return route.fulfill({ status:401, contentType:'application/json', body: '{"ok":false,"error":"apple_auth_failed"}' });
            Object.assign(st[id], { status:'on', account: st[id].provider==='apple' ? 'ana@icloud.com' : st[id].account, last_sync_at: st[id].syncs ? new Date().toISOString() : null, last_result: id==='iphone-contacts' ? { imported: 57 } : id==='apple-calendar' ? { busy: 6 } : null });
            return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, status:'on' }) });
          }
          if (act === 'disconnect') { Object.assign(st[id], { status:'off', last_result:null, last_sync_at:null }); return route.fulfill({ status:200, contentType:'application/json', body: '{"ok":true,"provider_released":false}' }); }
          st[id].last_sync_at = new Date().toISOString();
          return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, result: st[id].last_result ?? {} }) });
        }
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, apps: IDS.map(i => st[i]) }) });
      }
      if (u.includes('/__consent_stub')) return route.fulfill({ status:200, contentType:'text/html', body:'<h1>Microsoft consent (stub)</h1>' });
      if (u.includes('/rest/v1/rpc/get_role_preference')) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify([{ role: 'community' }]) });
      if (!u.startsWith('http://127.0.0.1') && !['GET','HEAD','OPTIONS'].includes(r.method())) { blocked.push(r.method()+' '+u.split('?')[0]); return route.abort(); }
      if (!u.startsWith('http://127.0.0.1') && u.startsWith('https://')) return route.fetch().then(resp => route.fulfill({ response: resp })).catch(() => route.abort());
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0,200)));
    await page.goto('http://127.0.0.1:8080/');
    await page.evaluate(([s, lang]) => {
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
      if (lang) localStorage.setItem('vitana::global::dev::language::selected_language', lang);
    }, [session, lang]);
    await page.goto('http://127.0.0.1:8080/connectors?tab=productivity');
    await page.waitForSelector('[data-testid="mailhub-panel"], [data-testid="mailhub-section-trigger"]', { timeout: 90000 });
    await page.waitForTimeout(2500);
    await steps(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(name, 'hscroll', overflow);
    await ctx.close();
  }
  const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png` });
  const flow = (tag) => async p => {
    if (await p.locator('[data-testid="mailhub-panel"]').count() === 0) { await p.click('[data-testid="mailhub-section-trigger"]'); await p.waitForTimeout(600); }
    await p.locator('[data-testid="mailhub-panel"]').scrollIntoViewIfNeeded();
    await shot(p, tag+'-1-list');
    await p.click('[data-testid="mailhub-toggle-apple-calendar"]'); await p.waitForTimeout(700);
    await shot(p, tag+'-2-apple-dialog');
    const d = p.locator('[data-testid="mailhub-apple-dialog"]');
    await d.locator('input').nth(0).fill('ana@icloud.com');
    await d.locator('input').nth(1).fill('abcd-efgh-ijkl-mnop');
    await shot(p, tag+'-3-apple-filled');
    await p.click('[data-testid="mailhub-apple-submit"]'); await p.waitForTimeout(1500);
    await p.locator('[data-testid="mailhub-row-apple-calendar"]').scrollIntoViewIfNeeded();
    await shot(p, tag+'-4-apple-on');
    await p.click('[data-testid="mailhub-toggle-google-contacts"]'); await p.waitForTimeout(700);
    await shot(p, tag+'-5-turn-off-dialog');
    await p.click('[data-testid="mailhub-off-confirm"]'); await p.waitForTimeout(1200);
    await p.click('[data-testid="mailhub-toggle-android-contacts"]'); await p.waitForTimeout(700);
    await shot(p, tag+'-6-android-help');
  };
  await run('mobile-de', {w:390,h:844}, flow('mobile-de'), 'de-DE');
  await run('desktop-en', {w:1400,h:900}, flow('desktop-en'), 'en-US');
  await run('mobile-ar', {w:390,h:844}, flow('mobile-ar'), 'ar-XA');
  await browser.close();
  console.log('stubbed hub calls:', hubCalls.filter(c=>!c.startsWith('GET')).join(', '));
  console.log('blocked remote writes:', [...new Set(blocked)].slice(0,15).join('\n') || 'none');
})();
