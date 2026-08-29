#!/usr/bin/env node
/**
 * VTID-03747 follow-up — standing E2E "Test Program" for all 10 non-Serbian
 * GA languages, pre-login AND post-login, covering visuals, real ORB audio,
 * and real clicking. Serbian is excluded on purpose — see VTID-03747:
 * Nova Sonic has no Serbian language capability and Polly has no Serbian
 * voice in any engine, so there is nothing this script could verify beyond
 * what scripts/tts/verify-all-orb-languages.ts (in vitana-platform) already
 * pins as an expected 422.
 *
 * SAFETY — reproduces this repo's absolute "never write as the test
 * account" rule mechanically, not just by promise:
 *
 *   - PRE-LOGIN language selection is proven safe by reading the source:
 *     LanguageContext.tsx's setSelectedLanguage() returns immediately after
 *     writing localStorage when `!user` — no Supabase call happens for an
 *     anonymous visitor. This script relies on that, not on trusting itself.
 *   - POST-LOGIN uses the CLAUDE.md-sanctioned test account
 *     (a27552a3-0257-4305-8ed0-351a80fd3701) for AUTH ONLY (a session-token
 *     fetch, the one documented unavoidable exception) and then installs a
 *     Playwright route interceptor on every non-GET request to
 *     `**\/rest/v1/user_preferences*` for the lifetime of the browser
 *     context, fulfilling it locally without ever letting the request reach
 *     Supabase. This lets the REAL in-app language switcher (a real click,
 *     the real Radix <Select>, the real LanguageContext reconciliation
 *     effect that would otherwise call updatePreferences()) be exercised
 *     end-to-end with a mechanical guarantee that nothing is written.
 *   - After the full post-login run, this script prints a reminder to
 *     independently confirm via a READ-ONLY query that
 *     user_preferences.stt_language for the test account is unchanged —
 *     belt-and-suspenders on top of the interception, not a replacement
 *     for it.
 *
 * Usage:
 *   BASE_URL=https://preview-aws.vitanaland.com \
 *   TEST_USER_EMAIL=e2e-test@vitana.dev TEST_USER_PASSWORD=... \
 *   node scripts/e2e/verify-all-languages-e2e.mjs
 *
 * Never point BASE_URL at vitanaland.com / dr-app.vitanaland.com — those are
 * production. Default is staging.
 */

import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://preview-aws.vitanaland.com').replace(/\/$/, '');
if (/(^|\/\/)(vitanaland\.com|www\.vitanaland\.com|dr-app\.vitanaland\.com)/.test(BASE_URL)) {
  console.error('[verify-all-languages-e2e] REFUSING to run against production host:', BASE_URL);
  console.error('Point BASE_URL at preview-aws.vitanaland.com (staging) or a PR preview instead.');
  process.exit(1);
}

const RESULTS_DIR = process.env.RESULTS_DIR || '/tmp/vitana-e2e-languages';
mkdirSync(RESULTS_DIR, { recursive: true });

// Same order as LanguageContext.tsx's `languageOptions` definition — index
// must match so the drawer/select's Nth option is the right language.
// Serbian (index 3) is deliberately skipped; see header comment.
const LANGS = [
  { code: 'de', value: 'de-DE', idx: 0 },
  { code: 'en', value: 'en-US', idx: 1 },
  { code: 'es', value: 'es-ES', idx: 2 },
  { code: 'fr', value: 'fr-FR', idx: 4 },
  { code: 'pt', value: 'pt-BR', idx: 5 },
  { code: 'ru', value: 'ru-RU', idx: 6 },
  { code: 'pl', value: 'pl-PL', idx: 7 },
  { code: 'ar', value: 'ar-XA', idx: 8, rtl: true },
  { code: 'zh', value: 'zh-CN', idx: 9 },
  { code: 'tr', value: 'tr-TR', idx: 10 },
];

const FAB_SELECTOR =
  '.vtorb-fab, [class^="vtorb-fab"], .vitana-orb, #vitana-orb-fab, [data-vitana-orb="true"]';
const CAPTION_SELECTOR = '.vtorb-status';

const VIEWPORTS = [
  { name: 'desktop', width: 1400, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

function readEnvValue(key) {
  try {
    const raw = readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const m = raw.match(new RegExp(`^${key}\\s*=\\s*"?([^"\n]+)"?`, 'm'));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || readEnvValue('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || readEnvValue('VITE_SUPABASE_PUBLISHABLE_KEY');
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'e2e-test@vitana.dev';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || null;

const results = [];

function record(phase, lang, check, ok, detail) {
  results.push({ phase, lang, check, ok, detail });
  const mark = ok ? 'OK  ' : 'FAIL';
  console.log(`  [${mark}] ${phase}/${lang}: ${check}${detail ? ' — ' + detail : ''}`);
}

/** Attach a websocket sniffer; returns a getter for {audioFrames, totalFrames}. */
function attachAudioSniffer(page) {
  const state = { audioFrames: 0, totalFrames: 0, sockets: 0 };
  page.on('websocket', (ws) => {
    state.sockets++;
    ws.on('framereceived', ({ payload }) => {
      state.totalFrames++;
      try {
        const text = typeof payload === 'string' ? payload : payload.toString('utf8');
        const msg = JSON.parse(text);
        if ((msg.type === 'audio' || msg.type === 'audio_out') && msg.data_b64) {
          state.audioFrames++;
        }
      } catch {
        // Binary/non-JSON frame — some transports send raw PCM frames.
        // Any non-trivial binary frame on the ORB socket also counts as audio.
        if (Buffer.isBuffer(payload) && payload.length > 256) state.audioFrames++;
      }
    });
  });
  return state;
}

async function screenshotBoth(page, dir, label) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(150); // let layout settle after resize
    await page.screenshot({ path: path.join(dir, `${label}-${vp.name}.png`) });
  }
}

async function testOrbInteraction(page, phase, lang) {
  const sniffer = attachAudioSniffer(page);

  const fab = page.locator(FAB_SELECTOR).first();
  const fabVisible = await fab.isVisible().catch(() => false);
  record(phase, lang, 'orb FAB visible', fabVisible);
  if (!fabVisible) return;

  await fab.click();
  record(phase, lang, 'orb FAB clicked (open)', true);

  const caption = page.locator(CAPTION_SELECTOR).first();
  let captionText = '';
  try {
    await caption.waitFor({ state: 'visible', timeout: 8000 });
    // Give the session a few seconds to reach a real state (connecting →
    // listening/speaking) and for audio to start flowing before we sample.
    await page.waitForTimeout(6000);
    captionText = (await caption.textContent()) || '';
  } catch (e) {
    record(phase, lang, 'caption element appeared', false, String(e));
  }
  record(phase, lang, 'caption non-empty', captionText.trim().length > 0, JSON.stringify(captionText));
  record(
    phase,
    lang,
    'real audio frames observed on ORB socket',
    sniffer.audioFrames > 0,
    `audioFrames=${sniffer.audioFrames} totalFrames=${sniffer.totalFrames} sockets=${sniffer.sockets}`,
  );

  // Close by clicking the FAB again — same real interaction a user performs.
  await fab.click().catch(() => {});
  await page.waitForTimeout(500);
}

async function testPreLogin(browser, lang, dir) {
  // ignoreHTTPSErrors: the sandbox's outbound-HTTPS proxy TLS-terminates
  // with its own CA bundle (/root/.ccr/ca-bundle.crt), which curl/Node trust
  // via the system store but a fresh Chromium profile does not — without
  // this every navigation fails at the TLS handshake, surfacing as
  // ERR_CONNECTION_RESET. Harmless outside a proxied sandbox (no proxy →
  // no interception → this option has nothing to ignore).
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/_intro/maxina`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Open the language drawer (glass pill) and pick the target language by
  // position — see the LANGS table comment for why index, not label text.
  const pill = page.getByRole('button', { name: /choose language/i }).first();
  await pill.click({ timeout: 10000 }).catch(async () => {
    // Fallback: the pill's aria-label is localized once a non-default
    // language is already active from a previous run in this context —
    // fall back to the first interactive element inside the known wrapper.
    await page.locator('button').filter({ hasText: '' }).first().click();
  });
  const option = page.getByRole('option').nth(lang.idx);
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  record('pre-login', lang.code, 'language drawer: option clicked', true);

  await page.waitForTimeout(500);

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  record('pre-login', lang.code, 'document.documentElement.lang updated', htmlLang === lang.code, htmlLang);

  const storedLang = await page.evaluate(() => localStorage.getItem('vitana.lang'));
  record('pre-login', lang.code, 'localStorage vitana.lang written', storedLang === lang.value, storedLang);

  if (lang.rtl) {
    const dir_ = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
    record('pre-login', lang.code, 'RTL direction applied for Arabic', dir_ === 'rtl', dir_);
  }

  await screenshotBoth(page, dir, `pre-login-${lang.code}`);

  await testOrbInteraction(page, 'pre-login', lang.code);

  await context.close();
}

async function getTestUserSession() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY not found — run from the vitana-v1 repo root');
  }
  if (!TEST_USER_PASSWORD) {
    throw new Error(
      'TEST_USER_PASSWORD not set. This is the sanctioned read-only test account '
      + '(a27552a3-0257-4305-8ed0-351a80fd3701) — auth-only, per CLAUDE.md. '
      + 'Set TEST_USER_EMAIL/TEST_USER_PASSWORD in the environment; never hardcode credentials in this file.',
    );
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Installs the write-blocking interceptor. Every non-GET request to
 * user_preferences is fulfilled locally — the browser believes it
 * succeeded, Supabase never sees it. This is what makes it safe to click
 * the REAL language switcher for an authenticated session.
 */
async function installWriteBlocker(context) {
  let blockedCount = 0;
  await context.route('**/rest/v1/user_preferences*', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      await route.continue();
      return;
    }
    blockedCount++;
    console.log(`  [BLOCKED WRITE] ${req.method()} ${req.url()} (not forwarded to Supabase)`);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{}]),
    });
  });
  return () => blockedCount;
}

async function testPostLogin(browser, lang, dir, session) {
  // ignoreHTTPSErrors: the sandbox's outbound-HTTPS proxy TLS-terminates
  // with its own CA bundle (/root/.ccr/ca-bundle.crt), which curl/Node trust
  // via the system store but a fresh Chromium profile does not — without
  // this every navigation fails at the TLS handshake, surfacing as
  // ERR_CONNECTION_RESET. Harmless outside a proxied sandbox (no proxy →
  // no interception → this option has nothing to ignore).
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, ignoreHTTPSErrors: true });
  const getBlockedCount = await installWriteBlocker(context);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    const projectRef = s.projectRef;
    localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(s.session));
    localStorage.setItem('vitana.authToken', s.session.access_token);
  }, { session, projectRef: new URL(SUPABASE_URL).hostname.split('.')[0] });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  await page.goto(`${BASE_URL}/settings/preferences`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const combobox = page.getByRole('combobox').first();
  const comboVisible = await combobox.isVisible().catch(() => false);
  record('post-login', lang.code, 'settings language selector visible', comboVisible);
  if (!comboVisible) {
    await context.close();
    return;
  }
  await combobox.click();
  const option = page.getByRole('option').nth(lang.idx);
  await option.waitFor({ state: 'visible', timeout: 10000 });
  await option.click();
  record('post-login', lang.code, 'settings language selector: option clicked (real click, write intercepted)', true);
  await page.waitForTimeout(500);

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  record('post-login', lang.code, 'document.documentElement.lang updated', htmlLang === lang.code, htmlLang);

  if (lang.rtl) {
    const dir_ = await page.evaluate(() => document.documentElement.dir || getComputedStyle(document.documentElement).direction);
    record('post-login', lang.code, 'RTL direction applied for Arabic', dir_ === 'rtl', dir_);
  }

  await screenshotBoth(page, dir, `post-login-settings-${lang.code}`);

  // Exercise the ORB on an authenticated screen too (not just settings).
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await screenshotBoth(page, dir, `post-login-home-${lang.code}`);
  await testOrbInteraction(page, 'post-login', lang.code);

  const blocked = getBlockedCount();
  record(
    'post-login',
    lang.code,
    'user_preferences write(s) intercepted, none reached Supabase',
    blocked > 0,
    `blocked=${blocked}`,
  );

  await context.close();
}

async function main() {
  console.log(`[verify-all-languages-e2e] base=${BASE_URL} results=${RESULTS_DIR}`);
  // A checked-out @playwright/test version can pin a browser revision that
  // doesn't match what's actually pre-installed in this environment
  // (Playwright then refuses to launch and asks to download — which the
  // sandbox blocks). Find whatever chromium-* revision IS actually
  // installed under PLAYWRIGHT_BROWSERS_PATH and launch that directly
  // rather than the version-pinned default.
  const launchOpts = { headless: true };
  // Chromium does not inherit HTTPS_PROXY/HTTP_PROXY from the environment
  // the way curl/fetch do — without this every request comes back
  // ERR_CONNECTION_RESET in a sandbox that routes outbound HTTPS through a
  // local proxy.
  if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
    launchOpts.proxy = { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY };
  }
  const browsersRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(browsersRoot)) {
    const rev = readdirSync(browsersRoot).find((d) => /^chromium-\d+$/.test(d));
    if (rev) {
      const candidate = path.join(browsersRoot, rev, 'chrome-linux', 'chrome');
      if (existsSync(candidate)) launchOpts.executablePath = candidate;
    }
  }
  const browser = await chromium.launch(launchOpts);

  console.log('\n=== PRE-LOGIN (anonymous — safe by construction, no Supabase write path exists) ===');
  for (const lang of LANGS) {
    const dir = path.join(RESULTS_DIR, 'pre-login', lang.code);
    mkdirSync(dir, { recursive: true });
    try {
      await testPreLogin(browser, lang, dir);
    } catch (e) {
      record('pre-login', lang.code, 'run threw', false, String(e && e.stack || e));
    }
  }

  console.log('\n=== POST-LOGIN (authenticated test account — writes mechanically intercepted) ===');
  let session = null;
  try {
    session = await getTestUserSession();
  } catch (e) {
    console.error('[verify-all-languages-e2e] Skipping post-login phase:', e.message);
  }
  if (session) {
    for (const lang of LANGS) {
      const dir = path.join(RESULTS_DIR, 'post-login', lang.code);
      mkdirSync(dir, { recursive: true });
      try {
        await testPostLogin(browser, lang, dir, session);
      } catch (e) {
        record('post-login', lang.code, 'run threw', false, String(e && e.stack || e));
      }
    }
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const byLang = new Map();
  for (const r of results) {
    const key = `${r.phase}/${r.lang}`;
    if (!byLang.has(key)) byLang.set(key, { pass: 0, fail: 0 });
    byLang.get(key)[r.ok ? 'pass' : 'fail']++;
  }
  let anyFail = false;
  for (const [key, { pass, fail }] of byLang) {
    if (fail > 0) anyFail = true;
    console.log(`  ${key}: ${pass} passed, ${fail} failed${fail > 0 ? '  <-- FAIL' : ''}`);
  }
  console.log(`\nScreenshots + full log: ${RESULTS_DIR}`);
  if (session) {
    console.log(
      '\nREMINDER: independently confirm via a READ-ONLY query that '
      + "user_preferences.stt_language for the test account (a27552a3-0257-4305-8ed0-351a80fd3701) "
      + 'is unchanged from before this run — the interceptor above should have blocked every write, '
      + 'but this is the belt-and-suspenders check, not a substitute for it.',
    );
  }
  process.exit(anyFail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
