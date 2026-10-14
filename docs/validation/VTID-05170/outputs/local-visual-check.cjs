// Local visual check for VTID-05170: harness page on 127.0.0.1, every non-local request blocked,
// timeline API answered from fixtures. No network call leaves the machine.
const path = require('path');
const { chromium } = require(path.join('/home/user/vitana-v1/node_modules', '@playwright/test'));
const OUT = process.argv[2];
const now = new Date();
const iso = (d, h) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, h, 12, 0).toISOString();
const ymd = (d) => iso(d, 12).slice(0, 10);
const M = (id, d, h, type, cat, topic, icon, pillar, sec, params, infl, sens = 'standard') => ({
  kind: 'moment', id, at: iso(d, h), tier: 'moment', activity_type: type, pillar, secondary_pillar: sec, category: cat, topic, icon,
  sensitivity: sens, summary: { key: 'k', params }, influence: infl, hidden_from_ai: false,
});
const items = [
  { kind: 'index_day', id: 'd0', date: ymd(0), delta_total: 14, score_total_after: 312, delta_pillars: { hydration: 6, sleep: 8 }, top_pillar: 'sleep', movements: 3, daily_update: false },
  { kind: 'day_digest', id: 'g0', date: ymd(0), counts: { reaction_given: 4, music_played: 2, comment_written: 1 }, total: 7 },
  M('00000000-0000-0000-0000-000000000001', 0, 9, 'health.log.water', 'hydration', 'water_logged', 'Droplets', 'hydration', null, { via: 'voice', amount_ml: 500 }, { kind: 'measured', delta_total: 6, delta_pillars: { hydration: 6 }, movement_id: 'm1' }),
  M('00000000-0000-0000-0000-000000000002', 0, 7, 'health.wearable_features.bridged', 'cross_pillar', 'wearable_sync', 'Watch', null, null, {}, { kind: 'measured', delta_total: 8, delta_pillars: { sleep: 8 } }),
  M('00000000-0000-0000-0000-000000000003', 0, 6, 'diary.create', 'diary', 'diary_entry', 'BookOpen', null, 'mental', { entry_type: 'voice' }, { kind: 'counted', pillar: 'mental' }),
  M('00000000-0000-0000-0000-000000000004', 0, 5, 'health.log.mood', 'mental', 'mood_checkin', 'Smile', 'mental', null, { via: 'voice' }, { kind: 'counted', pillar: 'mental' }, 'special_category'),
  { kind: 'index_day', id: 'd1', date: ymd(1), delta_total: -3, score_total_after: 298, delta_pillars: { exercise: -3 }, top_pillar: null, movements: 1, daily_update: true },
  M('00000000-0000-0000-0000-000000000005', 1, 19, 'community.group.join', 'community', 'group_joined', 'UserPlus', null, 'mental', {}, { kind: 'counted', pillar: 'mental' }),
  M('00000000-0000-0000-0000-000000000006', 1, 18, 'community.event.join', 'events', 'event_rsvp', 'CalendarCheck', null, 'mental', {}, { kind: 'counted', pillar: 'mental' }),
  M('00000000-0000-0000-0000-000000000007', 1, 8, 'health.log.exercise', 'exercise', 'workout_logged', 'Dumbbell', 'exercise', null, { via: 'manual', minutes: 45, activity: 'run' }, { kind: 'counted', pillar: 'exercise' }),
  M('00000000-0000-0000-0000-000000000008', 3, 21, 'journey.session.listened', 'cross_pillar', 'journey_session', 'Headphones', null, null, { topic: 'sleep-basics' }, null),
];
const spotlight = {
  score_total: 312, tier: 'building', change_today: 14, change_7d: 22,
  pillars: { nutrition: { score: 62, change_today: 0, momentum: 'steady' }, hydration: { score: 52, change_today: 6, momentum: 'rising' }, exercise: { score: 60, change_today: 0, momentum: 'slipping' }, sleep: { score: 74, change_today: 8, momentum: 'rising' }, mental: { score: 64, change_today: 0, momentum: 'steady' } },
  balance: { factor: 0.9, penalty_pct: 10, reason_key: 'timeline.balance.held_back', weakest_pillar: 'hydration' },
  weakest_pillar: 'hydration', strongest_pillar: 'sleep', top_contributors: [], last_computed: ymd(0),
};
const detail = { item: items[2], detail: { index_before: { hydration: 46, score_total: 298 }, index_after: { hydration: 52, score_total: 304 }, used_by_vitana: true, why_kept_key: 'timeline.why_kept.moment' } };

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
      if (u.pathname.startsWith('/api/v1/timeline')) {
        if (u.pathname === '/api/v1/timeline/spotlight') return route.fulfill({ json: { ok: true, spotlight } });
        if (u.pathname === '/api/v1/timeline') return route.fulfill({ json: { ok: true, items, next_cursor: null } });
        return route.fulfill({ json: { ok: true, ...detail } });
      }
      if (u.hostname === '127.0.0.1') return route.continue();
      blocked.push(u.hostname);
      return route.abort();
    });
    await page.goto('http://127.0.0.1:5179/timeline-harness.html');
    await page.getByTestId('timeline-index-spotlight').waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${name}-top.png` });
    await page.screenshot({ path: `${OUT}/${name}-full.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.getByTestId('timeline-moment').first().click();
    await page.getByTestId('timeline-detail-measured').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-detail.png` });
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
    await page.waitForTimeout(400);
    const overflowRtl = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    await page.screenshot({ path: `${OUT}/${name}-rtl.png` });
    console.log(name, 'overflow LTR', overflow, 'RTL', overflowRtl, 'blocked hosts', [...new Set(blocked)].join(','));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
