/**
 * BOOTSTRAP-ORB-DAY-CLOSE / VTID-03743 — live staging verification.
 *
 * Verifies the day-close ("goodnight") rung actually fires on a real ORB
 * voice session against AWS staging, post-deploy (commit 1ab195d4,
 * ORB_DAY_CLOSE_RUNG_ENABLED=true, staging-only).
 *
 * The rung only opens during local_hour 21:00-04:59 (isDayCloseWindow in
 * day-close-prompt.ts). Rather than fabricate that, this test honestly
 * drives a real browser whose IANA timezone (America/New_York by default,
 * overridable via DAYCLOSE_TZ) puts the CURRENT real time inside that
 * window — orb-widget.js reads Intl.DateTimeFormat().resolvedOptions()
 * .timeZone from the browser and sends it as client_timezone, exactly as a
 * real user in that timezone would. If the window has already closed by
 * the time this runs, the script says so rather than reporting a false
 * pass.
 *
 * This script does NOT judge whether day_close actually won — that's
 * judged afterward by reading oasis_events (read-only) for
 * wake_opener/greeting_sent/stamp_day_close_date_write against the
 * session_id and timestamp this script prints.
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const SUPA = process.env.SUPA_URL || 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const REF = (SUPA.match(/https:\/\/([a-z0-9]+)\.supabase/) || [])[1] || 'inmkhvwdcuyhnxkgfvsb';
const ANON =
  process.env.SUPA_ANON ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'VitanaE2eTest2026!';
const BASE = (process.env.PREVIEW_URL || 'https://preview-aws.vitanaland.com').replace(/\/+$/, '');
const TZ = process.env.DAYCLOSE_TZ || 'America/New_York';
const SCREEN_DIR = 'tests/e2e/screenshots-dayclose';

fs.mkdirSync(SCREEN_DIR, { recursive: true });

function localHourIn(tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).formatToParts(
    new Date(),
  );
  const h = parts.find((p) => p.type === 'hour')?.value;
  return h === '24' ? 0 : Number(h);
}

const hour = localHourIn(TZ);
const inWindow = hour >= 21 || hour <= 4;
console.log(`[dayclose-window] tz=${TZ} local_hour=${hour} inDayCloseWindow=${inWindow}`);
if (!inWindow) {
  console.log(
    `[dayclose-window] WARNING: ${TZ} is currently local_hour=${hour}, OUTSIDE the day-close window (21:00-04:59). ` +
      `This run cannot honestly test day_close firing — set DAYCLOSE_TZ to a zone currently in-window, or re-run later.`,
  );
}

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

const session = await getSession();
console.log(`[auth] OK — user_id=${session.user?.id} (${EMAIL})`);
console.log(`[target] frontend=${BASE}  (backed by preview-aws-gateway.vitanaland.com)`);

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } : {},
);

const roundStartIso = new Date().toISOString();
console.log(`\n========== day-close session — start=${roundStartIso} tz=${TZ} ==========`);
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  ignoreHTTPSErrors: true,
  timezoneId: TZ,
});
const page = await ctx.newPage();

const orbLogs = [];
const consoleErrors = [];
let wsAudioFrames = 0;
let wsAudioBytes = 0;
let wsOpened = false;
let wsUrl = null;

page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error') consoleErrors.push(t.slice(0, 300));
  if (/\[VTOrb\]|\[ORB\]|greeting|wake_opener|day_close|dayclose/i.test(t)) orbLogs.push(t.slice(0, 220));
});

page.on('websocket', (ws) => {
  if (/orb|live/i.test(ws.url())) {
    wsOpened = true;
    wsUrl = ws.url();
    ws.on('framereceived', (frame) => {
      const payload = frame.payload;
      const size = typeof payload === 'string' ? payload.length : (payload?.byteLength ?? payload?.length ?? 0);
      if (size > 200) {
        wsAudioFrames++;
        wsAudioBytes += size;
      }
    });
  }
});

await page.addInitScript(
  ({ ref, s }) => {
    try {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
    } catch (e) {}
  },
  { ref: REF, s: session },
);

let navOk = true;
try {
  await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 60000 });
} catch (e) {
  navOk = false;
  console.log(`  nav error: ${e.message}`);
}

await page
  .waitForFunction(
    () =>
      !!document.querySelector('.vtorb-fab,[class^="vtorb-fab"],#vitana-orb-fab') ||
      !!(window.VitanaOrb && typeof window.VitanaOrb.show === 'function'),
    { timeout: 60000 },
  )
  .catch(() => {});

await page.waitForTimeout(4000);
await page.screenshot({ path: `${SCREEN_DIR}/01-before.png` }).catch(() => {});

let clicked = false;
const fab = await page.$('.vtorb-fab, [class^="vtorb-fab"], #vitana-orb-fab');
if (fab) {
  await fab.click({ force: true }).catch(() => {});
  clicked = true;
}
await page.evaluate(() => {
  try {
    window.VitanaOrb && window.VitanaOrb.show();
  } catch {}
});

await page.waitForTimeout(2000);
await page.screenshot({ path: `${SCREEN_DIR}/02-opening.png` }).catch(() => {});

// Day-close's opener is short (buildDayCloseOpenerLine) — 14s covers the
// speak + a settle margin, matching the other e2e test's own budget.
await page.waitForTimeout(14000);
await page.screenshot({ path: `${SCREEN_DIR}/03-after-greeting.png` }).catch(() => {});

const roundEndIso = new Date().toISOString();

console.log(`  navOk=${navOk} clicked=${clicked} wsOpened=${wsOpened} wsUrl=${wsUrl}`);
console.log(`  audio frames captured: ${wsAudioFrames}  total bytes: ${wsAudioBytes}`);
console.log(`  console errors: ${consoleErrors.length}`);
if (consoleErrors.length) console.log(`    sample: ${consoleErrors.slice(0, 3).join(' || ')}`);
console.log(`  orb logs (tail): ${orbLogs.slice(-8).join(' | ') || '(none captured)'}`);
console.log(`  screenshots: 01-before.png / 02-opening.png / 03-after-greeting.png`);

await page.evaluate(() => {
  try {
    window.VitanaOrb && window.VitanaOrb.hide && window.VitanaOrb.hide();
  } catch {}
});
await ctx.close();
await browser.close();

const result = {
  user_id: session.user?.id,
  tz: TZ,
  local_hour_at_start: hour,
  in_day_close_window: inWindow,
  roundStartIso,
  roundEndIso,
  navOk,
  clicked,
  wsOpened,
  wsUrl,
  wsAudioFrames,
  wsAudioBytes,
  orbLogsTail: orbLogs.slice(-10),
  consoleErrorsCount: consoleErrors.length,
  consoleErrorsSample: consoleErrors.slice(0, 5),
};
fs.writeFileSync(`${SCREEN_DIR}/dayclose-test-results.json`, JSON.stringify(result, null, 2));
console.log(`\nFull JSON: ${SCREEN_DIR}/dayclose-test-results.json`);
console.log(`Test user_id for oasis_events cross-check: ${session.user?.id}`);
console.log(`Session window for oasis_events cross-check: [${roundStartIso} .. ${roundEndIso}]`);

process.exit(navOk && clicked ? 0 : 1);
