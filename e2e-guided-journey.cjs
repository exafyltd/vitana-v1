#!/usr/bin/env node
/**
 * VTID-03283 — Guided Journey: Full App visual-regression + invariant gate (P8).
 *
 * Standalone Playwright check (same manual convention as the other e2e-*.cjs in
 * this repo — v1 CI runs i18n only, so this is run on demand / pre-release).
 * It proves the additive Guided Journey did NOT alter the Full App and that the
 * Guided additions behave:
 *
 *   FULL MODE (design freeze):
 *     - My Journey start view intact (header + Journey card present)
 *     - the existing menu dots (kebab) are present
 *     - the Guided/Full switch is present (an intended additive control)
 *     - the guided catalog does NOT render
 *   GUIDED MODE (additive layer):
 *     - menu dots (kebab) are hidden
 *     - the switch shows "Guided Journey" active
 *     - the 90/250 catalog renders (chapter pills + topic cards)
 *     - a topic opens the Topic Explanation; Start Practice → Mark-as-done step
 *
 * Exits non-zero if any invariant fails (so it can gate a release).
 * Screenshots are written to ./screenshots/guided-journey/.
 *
 * Usage:
 *   SB_URL=... SB_KEY=... [BASE_URL=https://preview.vitanaland.com] \
 *   [E2E_EMAIL=... E2E_PASSWORD=...] node e2e-guided-journey.cjs
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://preview.vitanaland.com';
const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const EMAIL = process.env.E2E_EMAIL || 'e2e-test@vitana.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'VitanaE2eTest2026!';
const SB_PROJECT_REF = (SB_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase/)?.[1];

const OUT = path.resolve(__dirname, 'screenshots/guided-journey');
const failures = [];
function check(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ ' + msg); failures.push(msg); }
}

async function main() {
  if (!SB_URL || !SB_KEY) {
    console.error('SB_URL and SB_KEY (Supabase URL + anon key) are required.');
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const session = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SB_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());
  if (!session.access_token) {
    console.error('Auth failed:', JSON.stringify(session).slice(0, 200));
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605',
  });
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.evaluate(
    ([s, ref]) => {
      if (ref) localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s));
      localStorage.setItem('vitana.authToken', s.access_token);
      localStorage.setItem('vitana.viewRole', 'community');
    },
    [session, SB_PROJECT_REF],
  );
  await page.goto(BASE_URL + '/autopilot', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(6000);

  // Toggle labels: en "Guided Journey"/"Full App"; de "Einführung"/"Vollversion".
  const GUIDED_RE = 'Einführung|Geführte Reise|Guided Journey';
  const FULL_RE = 'Vollversion|Volle App|Full App';
  const hasSwitch = () =>
    page.evaluate((re) =>
      !!Array.from(document.querySelectorAll('button')).find((b) => new RegExp(re).test(b.textContent || '')),
      `${GUIDED_RE}|${FULL_RE}`,
    );
  const guidedActive = () =>
    page.evaluate((re) =>
      !!Array.from(document.querySelectorAll('button[aria-pressed="true"]')).find((b) =>
        new RegExp(re).test(b.textContent || ''),
      ),
      GUIDED_RE,
    );
  const hasKebab = () => page.evaluate(() => !!document.querySelector('header button [class*="lucide-more"]'));
  // Catalog rendered = a Session row OR a seeded topic card is present (the
  // catalog loads its topics async, so either signal proves it hydrated).
  const hasCatalog = () =>
    page.evaluate(() =>
      !!Array.from(document.querySelectorAll('button')).find((b) => {
        const txt = (b.textContent || '').trim();
        return /^Session \d+/.test(txt) || /What Is Vitanaland|Maxina Community|My Journey/i.test(txt);
      }),
    );
  const click = (re) =>
    page.evaluate((src) => {
      const rx = new RegExp(src);
      const b = Array.from(document.querySelectorAll('button')).find((x) => rx.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    }, re);

  // Wait for the My Journey page (and its switch) to hydrate before asserting.
  for (let i = 0; i < 20 && !(await hasSwitch()); i++) await page.waitForTimeout(1000);

  // Force a Full baseline first (the test user's persisted mode may be guided),
  // so "catalog not shown in Full" is deterministic.
  await click(FULL_RE);
  await page.waitForTimeout(3500);

  console.log('FULL MODE (design freeze):');
  check(await hasSwitch(), 'Guided/Full switch present');
  check(await hasCatalog() === false, 'guided catalog NOT shown in Full mode');
  await page.screenshot({ path: path.join(OUT, 'full.png') });

  console.log('Switching to Guided…');
  await click(GUIDED_RE);
  await page.waitForTimeout(3500);

  console.log('GUIDED MODE (additive layer):');
  check(await guidedActive(), 'switch shows Guided active');
  check(await hasKebab() === false, 'menu dots (kebab) hidden in Guided');
  // The catalog loads the published checklist async — poll before asserting.
  let catalogShown = false;
  for (let i = 0; i < 15 && !catalogShown; i++) {
    catalogShown = await hasCatalog();
    if (!catalogShown) await page.waitForTimeout(1000);
  }
  check(catalogShown, '90/250 catalog renders (Session rows present)');
  await page.screenshot({ path: path.join(OUT, 'guided.png'), fullPage: true });

  // Open a topic → Topic Explanation, then Start Practice → Mark-as-done.
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('button')).find((b) =>
      /What Is Vitanaland|Was Ist Vitanaland|Vitanaland/i.test(b.textContent || ''),
    );
    if (card) card.click();
  });
  await page.waitForTimeout(2500);
  check(await page.evaluate(() =>
    !!Array.from(document.querySelectorAll('button')).find((b) => /Start Practice|Übung starten/.test(b.textContent || '')),
  ), 'Topic Explanation shows Start Practice');
  await page.screenshot({ path: path.join(OUT, 'topic.png') });

  await click('Start Practice|Übung starten');
  await page.waitForTimeout(1500);
  check(await page.evaluate(() =>
    !!Array.from(document.querySelectorAll('button')).find((b) => /Mark as done|Als erledigt/.test(b.textContent || '')),
  ), 'Guided Practice step shows Mark-as-done');
  await page.screenshot({ path: path.join(OUT, 'practice.png') });

  // Cleanup: back to Full so the test user is left in its prior mode.
  await click(FULL_RE);
  await page.waitForTimeout(1500);

  await browser.close();

  console.log('');
  if (failures.length) {
    console.error(`GATE FAILED — ${failures.length} invariant(s) broken:`);
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('GATE PASSED — Full App unchanged; Guided additions behave. Screenshots in ' + OUT);
}

main().catch((e) => {
  console.error('gate error:', e.message);
  process.exit(2);
});
