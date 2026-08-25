/**
 * BOOTSTRAP-ORB-NEWDAY-STAMP-DIAGNOSTIC — live staging verification.
 *
 * Reproduces the exact user report ("every new conversation starts with the
 * new day greeting, ten times in a row") against AWS staging, post-fix
 * (PR #3179, commit 7bde0ca0..., an ancestor of the currently-deployed
 * staging commit). Drives the REAL staging frontend with a REAL browser:
 * signs in as the sanctioned e2e test user, clicks the ORB FAB like a real
 * user, captures real WebSocket audio frames (byte counts — proof audio was
 * actually sent, not just that a screenshot looks right), and screenshots
 * each of 3 back-to-back fresh sessions.
 *
 * This script does NOT judge the once-per-day guard itself — that's judged
 * afterward by reading oasis_events (read-only) for wake_opener/newday_
 * briefing_eval across the 3 session timestamps this script prints.
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
const SCREEN_DIR = 'tests/e2e/screenshots-newday-repeat';

fs.mkdirSync(SCREEN_DIR, { recursive: true });

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
const roundResults = [];

for (let round = 1; round <= 3; round++) {
  const roundStartIso = new Date().toISOString();
  console.log(`\n========== ROUND ${round}/3 — fresh session at ${roundStartIso} ==========`);
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, ignoreHTTPSErrors: true });
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
    if (/\[VTOrb\]|\[ORB\]|greeting|wake_opener|newday/i.test(t)) orbLogs.push(t.slice(0, 220));
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
  await page.screenshot({ path: `${SCREEN_DIR}/round${round}-01-before.png` }).catch(() => {});

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
  await page.screenshot({ path: `${SCREEN_DIR}/round${round}-02-opening.png` }).catch(() => {});

  await page.waitForTimeout(14000);
  await page.screenshot({ path: `${SCREEN_DIR}/round${round}-03-after-greeting.png` }).catch(() => {});

  const roundEndIso = new Date().toISOString();

  const result = {
    round,
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
  roundResults.push(result);

  console.log(`  navOk=${navOk} clicked=${clicked} wsOpened=${wsOpened} wsUrl=${wsUrl}`);
  console.log(`  audio frames captured: ${wsAudioFrames}  total bytes: ${wsAudioBytes}`);
  console.log(`  console errors: ${consoleErrors.length}`);
  if (consoleErrors.length) console.log(`    sample: ${consoleErrors.slice(0, 3).join(' || ')}`);
  console.log(`  orb logs (tail): ${orbLogs.slice(-6).join(' | ') || '(none captured)'}`);
  console.log(`  screenshots: round${round}-01-before.png / 02-opening.png / 03-after-greeting.png`);

  await page.evaluate(() => {
    try {
      window.VitanaOrb && window.VitanaOrb.hide && window.VitanaOrb.hide();
    } catch {}
  });
  await ctx.close();

  if (round < 3) {
    console.log('  waiting 10s before next round (matches original ~90s-total repro cadence)...');
    await new Promise((r) => setTimeout(r, 10000));
  }
}

await browser.close();

console.log('\n==================== SUMMARY ====================');
for (const r of roundResults) {
  console.log(
    `Round ${r.round}: navOk=${r.navOk} clicked=${r.clicked} wsOpened=${r.wsOpened} audioFrames=${r.wsAudioFrames} audioBytes=${r.wsAudioBytes} consoleErrors=${r.consoleErrorsCount}  window=[${r.roundStartIso} .. ${r.roundEndIso}]`,
  );
}
fs.writeFileSync(
  `${SCREEN_DIR}/orb-test-results.json`,
  JSON.stringify({ user_id: session.user?.id, rounds: roundResults }, null, 2),
);
console.log(`\nFull JSON: ${SCREEN_DIR}/orb-test-results.json`);
console.log(`Test user_id for oasis_events cross-check: ${session.user?.id}`);
const allOk = roundResults.every((r) => r.navOk && r.clicked);
process.exit(allOk ? 0 : 1);
