// VTID-04440 visual check: Messages → Contacts → Find friends.
// /api/v1/connected-apps is STUBBED (route.fulfill); every non-GET request to
// a remote host is aborted, so nothing is imported, synced or written on any
// live system. Sign-in only (rule 31); Supabase reads are read-only.
const { chromium } = require('/home/user/vitana-v1/node_modules/playwright');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('/home/user/vitana-v1/.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const OUT = process.argv[2];
// Fixture contacts as the hub imports them (sources google / icloud / android).
const CONTACTS = [
  { id: 'c1', user_id: 'x', contact_name: 'Ana Novak', contact_email: 'ana@example.com', contact_phone: null, contact_user_id: 'm1', is_on_platform: true, source: 'google', created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T10:00:00Z' },
  { id: 'c2', user_id: 'x', contact_name: 'Bojan Petrović', contact_email: null, contact_phone: '+381 64 123 4567', contact_user_id: null, is_on_platform: false, source: 'android', created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T10:00:00Z' },
  { id: 'c3', user_id: 'x', contact_name: 'Clara Weiss', contact_email: 'clara@example.com', contact_phone: '+49 170 555 0101', contact_user_id: null, is_on_platform: false, source: 'icloud', created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T10:00:00Z' },
];
const PROFILES = [{ user_id: 'm1', display_name: 'Ana Novak', avatar_url: null, handle: 'ana' }];
const apps = ['google-contacts','iphone-contacts','android-contacts'].map((id) => ({ id, status: id === 'google-contacts' ? 'on' : 'off', availability: 'ready' }));
(async () => {
  const session = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers:{'Content-Type':'application/json', apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY}, body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }) }).then(r=>r.json());
  if (!session.access_token) { console.log('signin failed'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const blocked = [];
  async function run(tag, vp, lang) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w < 500, hasTouch: vp.w < 500 });
    await ctx.route('**/*', (route) => {
      const r = route.request(); const u = r.url();
      if (u.includes('/api/v1/connected-apps')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, apps }) });
      if (r.method() === 'GET' && u.includes('/rest/v1/contacts')) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(CONTACTS) });
      if (r.method() === 'GET' && /\/rest\/v1\/(profiles|global_community_profiles)\?select=user_id/.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(PROFILES) });
      if (!u.startsWith('http://127.0.0.1') && r.method() !== 'GET' && !u.includes('/auth/v1/token')) {
        if (!(u.includes('/rest/v1/rpc/') && r.method() === 'POST' && /get_my|list_roles|current_/.test(u))) { blocked.push(r.method()+' '+u.split('?')[0]); return route.abort(); }
      }
      return route.continue();
    });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:8080/');
    await p.evaluate(([s, lang]) => {
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
      localStorage.setItem('vitana::global::dev::language::selected_language', lang);
    }, [session, lang]);
    await p.goto('http://127.0.0.1:8080/inbox'); await p.waitForTimeout(6000);
    await p.click(vp.w < 500 ? '[data-testid="inbox-filter-contacts"]' : 'button[role="tab"][id$="-trigger-contacts"]');
    await p.getByText('Clara Weiss').first().waitFor({ timeout: 15000 }).catch((e) => console.log(tag, 'contacts not shown:', e.message.split('\n')[0]));
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/${tag}-1-contacts-tab.png` });
    await p.click('[data-testid="find-friends-button"]'); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${tag}-2-consent.png` });
    await p.click('[data-testid="find-friends-consent-continue"]'); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${tag}-3-sources.png` });
    await p.click('[data-testid="find-friends-source-icloud"]'); await p.waitForTimeout(300);
    await p.click('[data-testid="find-friends-start"]'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `${OUT}/${tag}-4-connect-first.png` });
    const hs = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(tag, 'hscroll', hs);
    await ctx.close();
  }
  await run('mobile-de', { w: 390, h: 844 }, 'de-DE');
  await run('desktop-en', { w: 1400, h: 900 }, 'en-US');
  await run('mobile-ar', { w: 390, h: 844 }, 'ar-XA');
  console.log('blocked remote writes:', [...new Set(blocked)].join('\n'));
  await browser.close();
})();
