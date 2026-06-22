/**
 * Real-browser loading/no-flash test (VTID-03255).
 *
 * Drives the PRODUCTION build (dist/, served locally) in headless Chromium to
 * verify:
 *   1. Boot smoke — the app loads with NO module-init / TDZ crash and renders
 *      content (regression guard for the manualChunks white-screen incident).
 *   2. Lazy-locale — a default (de) cold load does NOT download the English
 *      locale shards; booting in en DOES fetch them on demand.
 *   3. No-wrong-screen-while-loading — hitting a gated route while logged out
 *      shows a full-screen spinner (role=status) and never paints the gated
 *      screen, then redirects.
 *
 * Self-contained: it serves dist/ on 127.0.0.1:4173 itself. Prerequisites:
 *   npm run build            # produce dist/
 *   npm i -D puppeteer       # one-time (downloads Chromium)
 *   node tests/loading-no-flash.cjs
 *
 * Backend hosts (gateway/supabase) may be egress-blocked, so network errors to
 * those are expected and ignored; only fatal JS init errors fail the test.
 */
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = path.resolve(__dirname, '..', 'dist');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ico':'image/x-icon','.map':'application/json' };

function startServer() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error(`dist/ not found at ${DIST} — run "npm run build" first.`);
    process.exit(2);
  }
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const fp = path.join(DIST, p);
    if (!fp.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    fs.stat(fp, (e, st) => {
      if (!e && st.isFile()) {
        res.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream', 'cache-control': 'no-cache' });
        fs.createReadStream(fp).pipe(res);
      } else {
        res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-cache' });
        fs.createReadStream(path.join(DIST, 'index.html')).pipe(res);
      }
    });
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}
const FATAL = /before initialization|is not defined|Cannot access|Unexpected token|SyntaxError/i;
// Console noise we explicitly tolerate (blocked backend / expected app logs).
const IGNORE = /Failed to fetch|net::ERR|403|ERR_FAILED|status of 4|status of 5|Supabase|gateway|\[VTOrb\]|\[Appilix|preload|CORS/i;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? `  (${detail})` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    // ───────────────────────── Test 1: boot smoke ─────────────────────────
    {
      const page = await browser.newPage();
      const fatals = [];
      page.on('console', (m) => {
        if (m.type() === 'error' && FATAL.test(m.text()) && !IGNORE.test(m.text())) fatals.push(m.text());
      });
      page.on('pageerror', (e) => {
        if (!IGNORE.test(String(e.message))) fatals.push('pageerror: ' + e.message);
      });
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await sleep(1500);
      const rootHtmlLen = await page.evaluate(() => (document.getElementById('root')?.innerHTML || '').length);
      const bodyText = await page.evaluate(() => document.body.innerText.trim());
      await page.screenshot({ path: '/tmp/boot.png' });
      check('boot: no fatal JS init/TDZ error', fatals.length === 0, fatals.slice(0, 2).join(' | '));
      check('boot: #root rendered content (not white screen)', rootHtmlLen > 500, `root html length=${rootHtmlLen}`);
      check('boot: visible text present', bodyText.length > 0, `text len=${bodyText.length}`);
      await page.close();
    }

    // ──────────────── Test 2: lazy-locale (de default vs en) ────────────────
    // localStorage key for the chosen language on a dev/localhost host:
    const LANG_KEY = 'vitana::global::dev::language::selected_language';
    {
      // 2a: default (de) cold load — capture every JS chunk fetched.
      const pageDe = await browser.newPage();
      const deJs = [];
      pageDe.on('requestfinished', (r) => { if (/\/assets\/.+\.js$/.test(r.url())) deJs.push(r.url()); });
      await pageDe.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await sleep(2000);
      await pageDe.close();

      // 2b: boot directly in English (set the language key BEFORE app scripts run).
      const pageEn = await browser.newPage();
      await pageEn.evaluateOnNewDocument((k) => { localStorage.setItem(k, 'en-US'); localStorage.setItem('vitana.lang', 'en-US'); }, LANG_KEY);
      const enJs = [];
      pageEn.on('requestfinished', (r) => { if (/\/assets\/.+\.js$/.test(r.url())) enJs.push(r.url()); });
      await pageEn.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      await sleep(2500);
      await pageEn.close();

      const enExtra = enJs.filter((u) => !deJs.includes(u));
      check('lazy-locale: de cold load baseline captured', deJs.length > 0, `de js chunks=${deJs.length}`);
      // English-active boot must fetch additional locale-shard chunks that the
      // German cold load never requested — proof en is NOT in the eager bundle.
      check('lazy-locale: en-active boot fetches extra (lazy) locale chunks', enExtra.length > 0,
        `extra chunks under en=${enExtra.length}`);
    }

    // ───────── Test 3: no wrong screen while loading a gated route ─────────
    {
      const page = await browser.newPage();
      // Install a high-frequency DOM sampler BEFORE any app code runs, recording
      // into a window global. The gated→redirect hop is client-side (same
      // document), so this survives it (unlike page.evaluate, whose context a
      // full navigation would destroy).
      await page.evaluateOnNewDocument(() => {
        window.__samples = [];
        const t0 = performance.now();
        const iv = setInterval(() => {
          const spinner = !!document.querySelector('.animate-spin, [role="status"] svg');
          const txt = (document.body.innerText || '').trim();
          window.__samples.push({ t: Math.round(performance.now() - t0), path: location.pathname, spinner, len: txt.length, head: txt.slice(0, 60) });
          if (performance.now() - t0 > 4000) clearInterval(iv);
        }, 40);
      });
      await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await sleep(4200);
      const captured = await page.evaluate(() => window.__samples || []);
      await page.screenshot({ path: '/tmp/gated.png' });
      const finalPath = await page.evaluate(() => location.pathname);
      await page.close();

      const sawSpinner = captured.some((s) => s.spinner);
      // While still on /home, the gated screen must NOT be fully painted — only
      // the spinner/empty bg. A fully-rendered gated screen would be substantial
      // non-spinner text while path is still /home.
      const gatedLeak = captured.find((s) => s.path === '/home' && !s.spinner && s.len > 400);
      check('no-flash: spinner shown while resolving the gated route', sawSpinner,
        `samples=${captured.length}`);
      check('no-flash: gated screen never painted before redirect', !gatedLeak,
        gatedLeak ? `leak@${gatedLeak.t}ms: "${gatedLeak.head}"` : 'no gated content at /home');
      check('no-flash: redirected away from gated route', finalPath !== '/home',
        `final path=${finalPath}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('TEST HARNESS ERROR:', e); process.exit(2); });
