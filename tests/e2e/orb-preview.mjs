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
 *
 * Re-run after BOOTSTRAP-ORB-STAGING-WARM (gateway-staging min-instances=1):
 * the [timed-auth-start:cold] figure should now drop under the 8s widget abort
 * so the logged-in orb starts and greets on the very first open.
 */
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const SUPA = process.env.SUPA_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const REF = (SUPA.match(/https:\/\/([a-z0-9]+)\.supabase/) || [])[1] || 'inmkhvwdcuyhnxkgfvsb';
const ANON = process.env.SUPA_ANON ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'VitanaE2eTest2026!';
const BASE = (process.env.PREVIEW_URL || 'https://preview-aws.vitanaland.com').replace(/\/+$/, '');
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
const GW = process.env.ORB_GATEWAY || 'https://preview-aws-gateway.vitanaland.com';
try {
  const pf = await fetch(`${GW}/api/v1/orb/live/session/start`, {
    method: 'OPTIONS',
    headers: {
      Origin: BASE,
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

// Timed AUTHENTICATED session/start from node (no 8s browser abort) — tells us
// the real server latency. If it's > 8000ms, the widget's AbortSignal.timeout(8s)
// is what kills the in-browser request (net::ERR_ABORTED).
for (const label of ['cold', 'warm']) {
  try {
    const t0 = Date.now();
    const r = await fetch(`${GW}/api/v1/orb/live/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: BASE, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ lang: 'de' }),
    });
    const ms = Date.now() - t0;
    const body = (await r.text()).slice(0, 140);
    console.log(`[timed-auth-start:${label}] HTTP ${r.status} in ${ms}ms  ${ms > 8000 ? '⚠️ >8s (widget would ABORT)' : 'under 8s'}  body=${body}`);
    // Does the ACTUAL POST response carry the CORS headers the browser enforces?
    // (OPTIONS preflight passing is not enough — the POST response itself must
    // echo Access-Control-Allow-Origin, and Allow-Credentials if the request is
    // credentialed.) This is what a node fetch silently ignores but a browser blocks on.
    for (const h of ['access-control-allow-origin', 'access-control-allow-credentials', 'vary']) {
      console.log(`[timed-auth-start:${label}]   resp ${h}: ${r.headers.get(h) ?? '(absent)'}`);
    }
  } catch (e) {
    console.log(`[timed-auth-start:${label}] error: ${e.message}`);
  }
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

  const corsMsgs = [];   // full-length CORS/credential diagnostics — the real reason
  const gwResponses = []; // every preview-gateway response + its ACAO header
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') consoleErrors.push(t.slice(0, 300));
    if (/cors|access-control|credential|preflight|has been blocked/i.test(t)) corsMsgs.push(t); // NO slice — keep full reason
    if (/\[VTOrb\]|\[ORB\]/.test(t)) orbLogs.push(t.slice(0, 200));
    if (/audio_out|audio chunk|greeting|isModelSpeaking|model_speaking|speaking/i.test(t)) audioSeen = true;
  });
  page.on('response', (resp) => {
    const u = resp.url();
    if (resp.url().includes('/orb/live/session/start')) {
      sessionStarts.push({ status: resp.status(), method: resp.request().method(), host: new URL(resp.url()).host });
    }
    // Record ACAO on EVERY gateway response so we can see if the actual (non-OPTIONS)
    // responses are missing it — the browser blocks those even when OPTIONS is fine.
    if (/gateway\.vitanaland\.com/.test(u) && resp.request().method() !== 'OPTIONS') {
      try {
        const h = resp.headers();
        gwResponses.push(`${resp.request().method()} ${new URL(u).pathname} -> ${resp.status()} ACAO=${h['access-control-allow-origin'] ?? '(absent)'} ACAC=${h['access-control-allow-credentials'] ?? '(absent)'}`);
      } catch { /* ignore */ }
    }
  });
  const reqFails = [];
  page.on('requestfailed', (req) => {
    if (req.url().includes('/orb/live/')) {
      reqFails.push(`${req.method()} ${new URL(req.url()).pathname} -> ${req.failure()?.errorText || 'failed'}`);
    }
  });

  // CDP — the authoritative failure reason. Network.loadingFailed carries
  // corsErrorStatus.corsError (e.g. MissingAllowOriginHeader,
  // HeaderDisallowedByPreflightResponse, PreflightDisallowedRedirect) and
  // blockedReason (csp, mixed-content, ...) that fetch() hides from JS as a
  // generic "Failed to fetch".
  const cdpFails = [];
  const cdpUrls = new Map();
  try {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent', (e) => { cdpUrls.set(e.requestId, (e.request && e.request.url) || ''); });
    cdp.on('Network.loadingFailed', (e) => {
      const u = cdpUrls.get(e.requestId) || '';
      if (/orb\/live\/|session\/start/.test(u)) {
        cdpFails.push(`${new URL(u).pathname} type=${e.type} canceled=${e.canceled} blocked=${e.blockedReason || '-'} cors=${e.corsErrorStatus ? e.corsErrorStatus.corsError : '-'} err=${e.errorText || '-'}`);
      }
    });
  } catch (e) { console.log(`  cdp attach failed: ${e.message}`); }

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

  // let the SPA settle so we don't open the orb mid-navigation (a hard nav aborts
  // in-flight fetches with a misleading "Failed to fetch"). networkidle never
  // fires here because reminders/stream is a long-lived SSE — use a fixed settle.
  await page.waitForTimeout(4000);

  // open the orb like a user: click the FAB (a real gesture, so AudioContext can start)
  let opened = false;
  const fab = await page.$('.vtorb-fab, [class^="vtorb-fab"], #vitana-orb-fab');
  if (fab) {
    await fab.click({ force: true }).catch(() => {});
    opened = true;
  }
  // Belt-and-suspenders: also call the public show() — opens the overlay AND
  // (re)starts the session. Safe to call alongside the FAB click.
  await page.evaluate(() => { try { window.VitanaOrb && window.VitanaOrb.show(); } catch { /* ignore */ } });
  if (!opened) opened = orbReady;

  // give the conversation flow time to start + greet
  await page.waitForTimeout(16000);
  const startAttempted = orbLogs.some((l) => /Starting Gemini Live session|_sessionStart: hasToken/.test(l));
  await page.screenshot({ path: `${SCREEN_DIR}/${profile.name}.png` }).catch(() => {});

  const start200 = sessionStarts.find((s) => s.status === 200);
  const fatalErrors = consoleErrors.filter((e) => !NOISE.test(e));
  const pass = navOk && orbReady && opened && !!start200;

  results.push({ profile: profile.name, navOk, orbReady, opened, sessionStarts, start200: !!start200, audioSeen, fatalErrors: fatalErrors.slice(0, 10), pass });

  console.log(`  navOk=${navOk} orbReady=${orbReady} opened=${opened}`);
  console.log(`  session/start: ${JSON.stringify(sessionStarts) || '[]'}`);
  console.log(`  failed orb requests: ${reqFails.join(' | ') || '(none)'}`);
  console.log(`  CDP loadingFailed (orb): ${cdpFails.join(' || ') || '(none)'}`);
  console.log(`  audio/greeting signal: ${audioSeen}`);
  console.log(`  CORS/credential diagnostics (${corsMsgs.length}): ${corsMsgs.slice(0, 4).join(' || ') || '(none captured)'}`);
  console.log(`  gateway responses (ACAO/ACAC):\n    ${gwResponses.slice(0, 12).join('\n    ') || '(none — all requests failed at network layer before a response)'}`);
  console.log(`  session/start attempted by widget: ${startAttempted}`);
  console.log(`  orb logs: ${orbLogs.slice(-12).join(' | ') || '(none)'}`);
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

// Phase 0 verify run: native session resumption + GoAway deployed to gateway-staging.

// Phase 1 verify run: single Opening Contract (decideOpening) deployed to gateway-staging.

// Phase 2 verify run: explicit conversation state machine deployed to gateway-staging.

// FINAL verify run: full VTID-03273 plan (Phases 0-3) deployed to gateway-staging.
