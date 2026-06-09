/**
 * BOOTSTRAP-ORB-E2E: self-test harness for the ORB voice conversation flow on
 * the live preview, run from a GitHub runner (open egress can reach preview;
 * the dev sandbox cannot). Drives BOTH a desktop and a mobile (iPhone 14)
 * viewport, authenticates as the e2e test user, clicks the orb like a real
 * user, and verifies the conversation flow actually starts — capturing
 * session/start network, console errors, audio/greeting signals, and
 * screenshots (uploaded as CI artifacts).
 *
 * Exit 0 only if every profile passes. This is how we stop claiming "done"
 * without proof: the job log IS the proof.
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const SUPA = process.env.SUPA_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const REF = (SUPA.match(/https:\/\/([a-z0-9]+)\.supabase/) || [])[1] || 'inmkhvwdcuyhnxkgfvsb';
const ANON = process.env.SUPA_ANON ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'VitanaE2eTest2026!';
const BASE = (process.env.PREVIEW_URL || 'https://preview.vitanaland.com').replace(/\/+$/, '');
const SCREEN_DIR = 'tests/e2e/screenshots';

const PROFILES = [
  { name: 'desktop-1400x900', opts: { viewport: { width: 1400, height: 900 } } },
  { name: 'mobile-iphone14', opts: { ...devices['iPhone 14'] } },
];

async function getSession() {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('AUTH FAILED: ' + JSON.stringify(j).slice(0, 300));
  return j;
}

// console noise we don't fail on (known pre-existing staging telemetry issues)
const NOISE = /rum\/beacon|notif-tap|favicon|the server responded with a status of (400|401|404)|Failed to load resource: net::ERR_FAILED https:\/\/gateway\.vitanaland\.com/;

fs.mkdirSync(SCREEN_DIR, { recursive: true });
const results = [];
const session = await getSession();
console.log(`[auth] OK — user ${session.user?.id} (${EMAIL}) against ${SUPA}`);

// Direct CORS-preflight probe (node fetch ignores CORS, so it returns the raw
// response headers the browser would judge). Pinpoints why the in-browser
// session/start fetch fails with "Failed to fetch".
const GW = process.env.ORB_GATEWAY || 'https://preview-gateway.vitanaland.com';
try {
  const pf = await fetch(`${GW}/api/v1/orb/live/session/start`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://preview.vitanaland.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  console.log(`[preflight] OPTIONS ${GW}/api/v1/orb/live/session/start -> HTTP ${pf.status}`);
  for (const h of ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-allow-credentials', 'vary']) {
    console.log(`[preflight]   ${h}: ${pf.headers.get(h) ?? '(absent)'}`);
  }
} catch (e) {
  console.log(`[preflight] probe error: ${e.message}`);
}

const browser = await chromium.launch();
for (const profile of PROFILES) {
  console.log(`\n========== ${profile.name} ==========`);
  const ctx = await browser.newContext(profile.opts);
  const page = await ctx.newPage();
  const consoleErrors = [];
  const orbLogs = [];
  const sessionStarts = [];
  let audioSeen = false;

  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') consoleErrors.push(t.slice(0, 300));
    if (/\[VTOrb\]|\[ORB\]/.test(t)) orbLogs.push(t.slice(0, 200));
    if (/audio_out|audio chunk|greeting|isModelSpeaking|model_speaking|speaking/i.test(t)) audioSeen = true;
  });
  page.on('response', (resp) => {
    if (resp.url().includes('/orb/live/session/start')) {
      sessionStarts.push({ status: resp.status(), method: resp.request().method(), host: new URL(resp.url()).host });
    }
  });
  const reqFails = [];
  page.on('requestfailed', (req) => {
    if (req.url().includes('/orb/live/')) {
      reqFails.push(`${req.method()} ${new URL(req.url()).pathname} -> ${req.failure()?.errorText || 'failed'}`);
    }
  });

  // inject the auth session BEFORE app scripts run, on every navigation
  await page.addInitScript(({ ref, s }) => {
    try {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
    } catch (e) { /* ignore */ }
  }, { ref: REF, s: session });

  let navOk = true;
  try {
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) { navOk = false; console.log(`  nav error: ${e.message}`); }

  // wait for the orb widget (FAB element or the VitanaOrb global) to be ready
  await page.waitForFunction(
    () => !!document.querySelector('.vtorb-fab,[class^="vtorb-fab"],#vitana-orb-fab') ||
          !!(window.VitanaOrb && typeof window.VitanaOrb.show === 'function'),
    { timeout: 60000 },
  ).catch(() => {});

  const orbReady = await page.evaluate(() =>
    !!document.querySelector('.vtorb-fab,[class^="vtorb-fab"],#vitana-orb-fab') ||
    !!(window.VitanaOrb && typeof window.VitanaOrb.show === 'function'));

  // open the orb like a user: click the FAB (a real gesture, so AudioContext can start)
  let opened = false;
  const fab = await page.$('.vtorb-fab, [class^="vtorb-fab"], #vitana-orb-fab');
  if (fab) {
    await fab.click({ force: true }).catch(() => {});
    opened = true;
  } else if (orbReady) {
    opened = await page.evaluate(() => { try { window.VitanaOrb.show(); return true; } catch { return false; } });
  }

  // give the conversation flow time to start + greet
  await page.waitForTimeout(16000);
  await page.screenshot({ path: `${SCREEN_DIR}/${profile.name}.png` }).catch(() => {});

  const start200 = sessionStarts.find((s) => s.status === 200);
  const fatalErrors = consoleErrors.filter((e) => !NOISE.test(e));
  const pass = navOk && orbReady && opened && !!start200;

  results.push({ profile: profile.name, navOk, orbReady, opened, sessionStarts, start200: !!start200, audioSeen, fatalErrors: fatalErrors.slice(0, 10), pass });

  console.log(`  navOk=${navOk} orbReady=${orbReady} opened=${opened}`);
  console.log(`  session/start: ${JSON.stringify(sessionStarts) || '[]'}`);
  console.log(`  failed orb requests: ${reqFails.join(' | ') || '(none)'}`);
  console.log(`  audio/greeting signal: ${audioSeen}`);
  console.log(`  orb logs: ${orbLogs.slice(-6).join(' | ') || '(none)'}`);
  console.log(`  fatal console errors (${fatalErrors.length}): ${fatalErrors.slice(0, 6).join(' || ') || 'none'}`);
  console.log(`  screenshot: ${SCREEN_DIR}/${profile.name}.png`);
  console.log(`  RESULT ${profile.name}: ${pass ? '✅ PASS' : '❌ FAIL'}`);
  await ctx.close();
}
await browser.close();

console.log('\n==================== SUMMARY ====================');
for (const r of results) {
  console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'} ${r.profile} — orbReady=${r.orbReady} opened=${r.opened} start200=${r.start200} audio=${r.audioSeen} fatalErrs=${r.fatalErrors.length}`);
}
const allPass = results.length > 0 && results.every((r) => r.pass);
console.log(allPass ? 'OVERALL: ✅ PASS' : 'OVERALL: ❌ FAIL');
process.exit(allPass ? 0 : 1);
