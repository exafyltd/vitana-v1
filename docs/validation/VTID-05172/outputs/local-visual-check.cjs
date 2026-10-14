// Local visual check for VTID-05172: harness page on 127.0.0.1 (the four new Memory cards), every
// non-local request blocked, gateway answered from fixtures. No network call leaves the machine.
const path = require('path');
const { chromium } = require(path.join('/home/user/vitana-v1/node_modules', '@playwright/test'));
const OUT = process.argv[2];
const spotlight = {
  score_total: 312, tier: 'building', change_today: 14, change_7d: 22,
  pillars: { nutrition: { score: 62, change_today: 0, momentum: 'steady' }, hydration: { score: 52, change_today: 6, momentum: 'rising' }, exercise: { score: 60, change_today: 0, momentum: 'slipping' }, sleep: { score: 74, change_today: 8, momentum: 'rising' }, mental: { score: 64, change_today: 0, momentum: 'steady' } },
  balance: { factor: 0.9, penalty_pct: 10, reason_key: 'timeline.balance.held_back', weakest_pillar: 'hydration' },
  weakest_pillar: 'hydration', strongest_pillar: 'sleep', top_contributors: [], last_computed: '2026-10-14',
};
const routines = [
  { id: 'r1', routine_kind: 'pillar_rhythm', routine_key: 'sleep', metadata: { pillar: 'sleep', bucket: 'night', days_per_week: 5.2 }, confidence: 0.9 },
  { id: 'r2', routine_kind: 'active_hours', routine_key: 'overall', metadata: { bucket: 'morning' }, confidence: 0.8 },
  { id: 'r3', routine_kind: 'screen_habit', routine_key: '/community', metadata: { path: '/community', days: 18 }, confidence: 0.75 },
  { id: 'r4', routine_kind: 'feature_affinity', routine_key: 'community', metadata: { category: 'community' }, confidence: 0.7 },
  { id: 'r5', routine_kind: 'day_of_week_rhythm', routine_key: 'dow:0', metadata: { dow_index: 0 }, confidence: 0.6 },
];
const cats = ['nutrition', 'hydration', 'exercise', 'sleep', 'mental', 'cross_pillar', 'diary', 'goals', 'journey', 'vitana', 'community', 'events', 'live_media', 'shop', 'wallet', 'account', 'app_usage'];
const prefs = { ok: true, available: true, prefs: cats.map((c) => ({ category: c, learn: c !== 'shop' })) };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1400, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'de-DE' });
    await ctx.addInitScript(() => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify({ access_token: 'local.fake.token', refresh_token: 'x', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-0000-0000-00000000000a' } }));
    });
    const page = await ctx.newPage();
    const blocked = [];
    await page.route('**/*', (route) => {
      const u = new URL(route.request().url());
      const p = u.pathname;
      if (p === '/api/v1/timeline/spotlight') return route.fulfill({ json: { ok: true, spotlight } });
      if (p === '/api/v1/timeline/routines') return route.fulfill({ json: { ok: true, routines } });
      if (p === '/api/v1/timeline/learning-prefs') return route.fulfill({ json: prefs });
      if (p === '/api/v1/timeline/usage-data') return route.fulfill({ json: { ok: true, available: true, count: 4821 } });
      if (u.hostname === '127.0.0.1') return route.continue();
      blocked.push(u.hostname);
      return route.abort();
    });
    await page.goto('http://127.0.0.1:5179/p6-harness.html');
    await page.getByTestId('memory-week-story').waitFor({ timeout: 60000 });
    await page.getByTestId('memory-routine').first().waitFor({ timeout: 30000 });
    await page.getByTestId('memory-usage-count').waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/screenshot-${name}-full.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.getByTestId('memory-usage-delete').click();
    await page.getByTestId('memory-usage-delete-confirm').waitFor({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/screenshot-${name}-delete-confirm.png` });
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await page.waitForTimeout(400);
    const overflowRtl = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: `${OUT}/screenshot-${name}-rtl.png`, fullPage: name === 'mobile' });
    console.log(name, 'overflow LTR', overflow, 'RTL', overflowRtl, 'blocked hosts', [...new Set(blocked)].join(','));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
