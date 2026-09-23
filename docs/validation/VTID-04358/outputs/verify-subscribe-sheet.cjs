// VTID-04358 visual check (subscription sheet). The calendar window read AND the
// /calendar/subscription GET/POST/DELETE are STUBBED locally — no link is created on any live system.
// Original VTID-04351 note: The calendar window read is STUBBED locally
// (route.fulfill) — no calendar data is read from or written to any live system.
// Every other non-GET request to a remote host is aborted.
const { chromium } = require('/home/user/vitana-v1/node_modules/playwright');
const fs = require('fs');
const env = Object.fromEntries(fs.readFileSync('/home/user/vitana-v1/.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}));
const OUT = process.argv[2];
const at = (dayOff, h, m=0) => { const d = new Date(); d.setDate(d.getDate()+dayOff); d.setHours(h,m,0,0); return d.toISOString(); };
const ev = (id, o) => ({ id, title:'', description:null, location:null, event_type:'personal', status:'confirmed', source_type:'manual', source_ref_type:null, role_context:'community', completion_status:null, completed_at:null, wellness_tags:[], pillar:null, rrule:null, emoji:null, attendees_count:0, metadata:{}, ...o });
const item = (id, start, end, e, extra={}) => ({ id, event_id:id, start_time:start, end_time:end, busy:!e, occurrence_index:null, event:e, ...extra });
function fixture(from, to) {
  const all = [];
  for (let d=-10; d<=35; d++) {
    all.push(item('water'+d, at(d,7), at(d,7,10), ev('water'+d,{title:'Glas Wasser nach dem Aufwachen',pillar:'hydration',rrule:'FREQ=DAILY',completion_status:d<0||d===0?'completed':null}), {occurrence_index:d+10, display_emoji:'💧', reminders:[{kind:'before',minutes:0}]}));
    if (d%2===0) all.push(item('run'+d, at(d,8), at(d,8,30), ev('run'+d,{title:'Zone-2-Lauf, 30 Min.',event_type:'workout',source_type:'health_plan',completion_status:d<=0?'completed':null}), {display_emoji:'🏃', reminders:[{kind:'before',minutes:30}]}));
    if (d%3===0) all.push(item('busy'+d, at(d,10), at(d,11), null));
    all.push(item('lunch'+d, at(d,12,30), at(d,13,15), ev('lunch'+d,{title:'Mediterrane Lunch-Bowl',event_type:'nutrition',source_type:'autopilot',description:'Vitana schlägt heute eine Bowl mit Linsen, Olivenöl und Blattgrün vor.'}), {display_emoji:'🥗', reminders:[{kind:'before',minutes:0}]}));
    if (d%4===1||d===0) all.push(item('meet'+d, at(d,18), at(d,19,30), ev('meet'+d,{title:'Sonnenuntergangs-Spaziergang',event_type:'community',source_type:'community_rsvp',location:'Tempelhofer Feld, Berlin'}), {display_emoji:'🎉', reminders:[{kind:'before',minutes:10}]}));
    all.push(item('sleep'+d, at(d,22,30), at(d,23), ev('sleep'+d,{title:'Runterfahren, Bildschirme aus',pillar:'sleep',rrule:'FREQ=DAILY'}), {occurrence_index:d+10, display_emoji:'😴', reminders:[{kind:'before',minutes:0}]}));
  }
  all.push(item('lab', at(2,8), at(2,8,30), ev('lab',{title:'Bluttest – Longevity-Panel',event_type:'health',source_type:'lab_order',source_ref_type:'lab_order',location:'Labor Mitte, Berlin',description:'Nüchtern ab 22 Uhr am Vorabend. Wasser ist okay.\nApoB und HbA1c wurden seit 9 Monaten nicht geprüft.'}), {display_emoji:'🧪', reminders:[{kind:'evening_before',hour:19},{kind:'before',minutes:60}]}));
  return all.filter(i => i.start_time >= from && i.start_time < to).sort((a,b)=>a.start_time.localeCompare(b.start_time));
}
(async () => {
  const session = await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`, { method:'POST', headers:{'Content-Type':'application/json', apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY}, body: JSON.stringify({ email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }) }).then(r=>r.json());
  if (!session.access_token) { console.log('signin failed'); process.exit(1); }
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const blocked = []; const subCalls = [];
  async function run(name, vp, steps, lang) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.w<500, hasTouch: vp.w<500 });
    await ctx.grantPermissions(['clipboard-read','clipboard-write'], { origin: 'http://127.0.0.1:8080' });
    let active = false;
    await ctx.route('**/*', (route) => {
      const r = route.request(); const u = r.url();
      if (u.includes('/api/v1/calendar/subscription')) {
        subCalls.push(r.method());
        if (r.method()==='POST') { active = true; return route.fulfill({ status:201, contentType:'application/json', body: JSON.stringify({ ok:true, data:{ feed_path:'/api/v1/calendar/feed/'+'x'.repeat(43)+'.ics' } }) }); }
        if (r.method()==='DELETE') { active = false; return route.fulfill({ status:200, contentType:'application/json', body: '{"ok":true}' }); }
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, data: active ? { active:true, created_at:new Date().toISOString(), last_used_at:null } : { active:false, created_at:null, last_used_at:null } }) });
      }
      if (u.includes('/api/v1/calendar/events/window')) {
        const q = new URL(u).searchParams;
        return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, timezone:'Europe/Berlin', data: fixture(q.get('from'), q.get('to')) }) });
      }
      if (u.includes('/rest/v1/rpc/get_role_preference')) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify([{ role: 'community' }]) });
      if (u.includes('/rest/v1/rpc/get_my_permitted_roles') || u.includes('/rest/v1/rpc/list_roles_for_active_tenant')) return route.fulfill({ status:200, contentType:'application/json', body: '[]' });
      if (!u.startsWith('http://127.0.0.1') && !['GET','HEAD','OPTIONS'].includes(r.method())) { blocked.push(r.method()+' '+u.split('?')[0]); return route.abort(); }
      if (!u.startsWith('http://127.0.0.1') && u.startsWith('https://')) {
        return route.fetch().then(resp => route.fulfill({ response: resp })).catch(() => route.abort());
      }
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERR', e.message.slice(0,200)));
    await page.goto('http://127.0.0.1:8080/');
    await page.evaluate(([s, lang]) => {
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
      localStorage.setItem('vitana.calendar.view', 'day');
      if (lang) localStorage.setItem('vitana::global::dev::language::selected_language', lang);
    }, [session, lang]);
    await page.goto('http://127.0.0.1:8080/calendar');
    await page.waitForSelector('[data-testid="vcal-page"]', { timeout: 60000 });
    await page.waitForTimeout(2500);
    await steps(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(name, 'hscroll', overflow);
    await ctx.close();
  }
  const shot = (p, n) => p.screenshot({ path: `${OUT}/sub-${n}.png` });
  const flow = (tag) => async p => {
    await shot(p, tag+'-header');
    await p.click('[data-testid="vcal-subscribe-open"]'); await p.waitForTimeout(800); await shot(p, tag+'-empty');
    await p.click('[data-testid="vcal-subscribe-create"]'); await p.waitForTimeout(1000); await shot(p, tag+'-fresh');
    const v = await p.inputValue('#vcal-feed-url'); console.log(tag, 'url', v);
    await p.click('[data-testid="vcal-subscribe-revoke"]'); await p.waitForTimeout(1000); await shot(p, tag+'-revoked');
  };
  await run('mobile-en', {w:390,h:844}, flow('mobile-en'));
  await run('desktop-en', {w:1400,h:900}, flow('desktop-en'));
  await run('mobile-ar', {w:390,h:844}, flow('mobile-ar'), 'ar-XA');
  await browser.close();
  console.log('subscription calls (all stubbed):', subCalls.join(','));
  console.log('blocked remote writes:', [...new Set(blocked)].slice(0,15).join('\n') || 'none');
})();
