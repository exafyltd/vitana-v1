/**
 * Intro-screen Orb placement check.
 *
 * USAGE
 *   npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
 *   # serve the real orb widget locally — it normally comes from the gateway,
 *   # which a sandboxed browser may not be able to reach:
 *   mkdir -p dist/command-hub
 *   cp ../vitana-platform/services/gateway/src/frontend/command-hub/orb-widget.js dist/command-hub/
 *   sed -i 's|https://gateway.vitanaland.com/command-hub/orb-widget.js|/command-hub/orb-widget.js|g' dist/index.html
 *   node scripts/verify-intro-orb-placement.mjs
 *
 *   BASE_URL=https://preview-aws.vitanaland.com node scripts/verify-intro-orb-placement.mjs
 *     — runs against deployed staging instead, where the widget is already served.
 *
 * This complements `src/pages/IntroExperience.orb-placement.test.ts`: that test
 * pins the CONTRACT (a slot exists, it is measured, the orb is never shrunk);
 * this measures the RESULT in a real browser, which is the only thing that can
 * catch an actual collision.
 *
 * Asserts, for every shipped language, that the Orb:
 *   1. does not overlap ANY text on the screen,
 *   2. is horizontally centred on the viewport,
 *   3. has the SAME vertical gap to the text above it as to the text below it,
 *   4. is never smaller than the widget's own base size.
 *
 * Mobile (390x844) is the primary target; desktop is checked as a regression net.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.OUT_DIR || '/tmp/orbshots';
mkdirSync(OUT, { recursive: true });

// value = the LanguageContext option value, label = for the report
const LANGS = [
  ['de-DE', 'German'],
  ['en-US', 'English'],
  ['es-ES', 'Spanish'],
  ['sr-RS', 'Serbian'],
  ['fr-FR', 'French'],
  ['pt-BR', 'Portuguese'],
  ['ru-RU', 'Russian'],
  ['pl-PL', 'Polish'],
  ['ar-XA', 'Arabic (RTL)'],
  ['zh-CN', 'Chinese'],
];

const VIEWPORTS = [
  ['mobile', 390, 844],
  ['small', 360, 640],   // smallest realistic Android
  ['desktop', 1400, 900],
];

// The widget's own base size: 64px, or 56px under 600px wide. The Orb on this
// screen must never be smaller than that.
const baseOrbSize = (w) => (w <= 600 ? 56 : 64);

const ORB_SEL = '.vtorb-fab, [class^="vtorb-fab"], .vitana-orb, #vitana-orb-fab, [data-vitana-orb="true"]';

async function measure(page, viewportWidth) {
  return page.evaluate(({ orbSel, vw }) => {
    const orb = document.querySelector(orbSel);
    if (!orb) return { error: 'orb element not found' };
    const o = orb.getBoundingClientRect();
    if (o.width === 0 || o.height === 0) return { error: 'orb has zero size' };

    const col = document.querySelector('.maxina-page-content');
    if (!col) return { error: 'content column not found' };

    const slot = document.querySelector('.maxina-orb-slot');

    // Every element in the column that actually paints text.
    const texts = [...col.querySelectorAll('p, h1, button, a, kbd')]
      .filter((el) => (el.textContent || '').trim().length > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.textContent || '').trim().slice(0, 40),
          top: r.top, bottom: r.bottom, left: r.left, right: r.right,
          h: r.height,
        };
      })
      .filter((t) => t.h > 0);

    // Overlap = rectangles intersect on BOTH axes.
    const overlaps = texts.filter(
      (t) => o.left < t.right && o.right > t.left && o.top < t.bottom && o.bottom > t.top,
    );

    // Nearest text above the orb, and nearest below.
    const above = texts.filter((t) => t.bottom <= o.top).sort((a, b) => b.bottom - a.bottom)[0];
    const below = texts.filter((t) => t.top >= o.bottom).sort((a, b) => a.top - b.top)[0];

    return {
      orb: { top: o.top, bottom: o.bottom, left: o.left, right: o.right, w: o.width, h: o.height },
      orbCenterX: o.left + o.width / 2,
      orbCenterY: o.top + o.height / 2,
      viewportCenterX: vw / 2,
      slot: slot ? (() => { const r = slot.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height, centerY: r.top + r.height / 2 }; })() : null,
      gapAbove: above ? o.top - above.bottom : null,
      gapBelow: below ? below.top - o.bottom : null,
      textAbove: above ? above.text : null,
      headline: (() => { const h = col.querySelector('p.text-4xl'); return h ? (h.textContent || '').trim().slice(0, 48) : null; })(),
      textBelow: below ? below.text : null,
      overlaps: overlaps.map((t) => t.text),
      cssVar: getComputedStyle(document.documentElement).getPropertyValue('--maxina-orb-top').trim(),
      docScrollable: document.documentElement.scrollHeight > window.innerHeight + 1,
    };
  }, { orbSel: ORB_SEL, vw: viewportWidth });
}

const results = [];
let failures = 0;

// This repo pins an older Playwright than the browser bundle installed in the
// image, so point at the real binary rather than downloading a second copy.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
try {
  for (const [vpName, w, h] of VIEWPORTS) {

    for (const [value, label] of LANGS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();

    // The sandbox has no route to the public internet, so Google Fonts and the
    // hosted intro video each stall until Chromium gives up — ~90s per load
    // across 30 combinations. Abort them immediately instead of waiting for
    // the failure. Neither affects the geometry under test: the orb is placed
    // from a measured rect, not from font metrics, and the video is a
    // background layer behind the content column.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      return route.abort();
    });

      // The app namespaces localStorage as vitana::<tenant>::<env>::<module>::<key>.
      // <env> is exactly "dev" | "staging" | "prod" (src/lib/localStorage.ts,
      // derived from the hostname) — NOT "development"/"production"/"local".
      // Guessing those wrote keys nothing reads, so every language silently
      // rendered the German default and the whole matrix passed while
      // exercising one locale thirty times. Write all three real values.
      await page.addInitScript((lang) => {
        for (const env of ['dev', 'staging', 'prod']) {
          localStorage.setItem(`vitana::global::${env}::language::selected_language`, lang);
        }
      }, value);

      // NOT `networkidle` — the intro video loops and the orb widget holds a
      // long-lived connection, so the network never goes idle on this page.
      await page.goto(`${BASE}/_intro/maxina`, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Content fades in on a 2.4s delay chain; the orb widget is a deferred
      // external script. Wait for both to actually exist before measuring.
      await page.waitForSelector('.maxina-page-content', { timeout: 20000 });
      try {
        await page.waitForSelector(ORB_SEL, { state: 'attached', timeout: 20000 });
      } catch {
        results.push({ vpName, label, error: 'ORB WIDGET NEVER LOADED' });
        failures++;
        continue;
      }
      await page.waitForTimeout(3000); // let the fade-in chain finish

      const m = await measure(page, w);
      const shot = `${OUT}/${vpName}-${value}.png`;
      await page.screenshot({ path: shot });

      if (m.error) {
        results.push({ vpName, label, error: m.error, shot });
        failures++;
        continue;
      }

      const minSize = baseOrbSize(w);
      const symmetryDelta = (m.gapAbove !== null && m.gapBelow !== null)
        ? Math.abs(m.gapAbove - m.gapBelow) : null;
      const centerDelta = Math.abs(m.orbCenterX - m.viewportCenterX);

      const problems = [];
      if (m.overlaps.length) problems.push(`OVERLAPS TEXT: ${m.overlaps.join(' | ')}`);
      if (centerDelta > 1) problems.push(`not horizontally centred (off by ${centerDelta.toFixed(1)}px)`);
      if (symmetryDelta === null) problems.push('could not find text both above and below the orb');
      else if (symmetryDelta > 1) problems.push(`asymmetric: above=${m.gapAbove.toFixed(1)} below=${m.gapBelow.toFixed(1)} (delta ${symmetryDelta.toFixed(1)}px)`);
      if (m.orb.w < minSize) problems.push(`orb SMALLER than base: ${m.orb.w}px < ${minSize}px`);

      if (problems.length) failures++;
      results.push({
        vpName, label, value, shot,
        size: `${Math.round(m.orb.w)}x${Math.round(m.orb.h)}`,
        gapAbove: m.gapAbove === null ? null : +m.gapAbove.toFixed(1),
        gapBelow: m.gapBelow === null ? null : +m.gapBelow.toFixed(1),
        delta: symmetryDelta === null ? null : +symmetryDelta.toFixed(1),
        centerDelta: +centerDelta.toFixed(1),
        above: m.textAbove, below: m.textBelow, headline: m.headline,
        cssVar: m.cssVar,
        scrollable: m.docScrollable,
        problems,
      });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

const pad = (s, n) => String(s ?? '—').padEnd(n);
console.log('\n' + pad('VIEWPORT', 10) + pad('LANG', 16) + pad('SIZE', 10) + pad('ABOVE', 8) + pad('BELOW', 8) + pad('Δ', 7) + pad('CTR-Δ', 7) + 'STATUS');
console.log('-'.repeat(110));
for (const r of results) {
  if (r.error) { console.log(pad(r.vpName, 10) + pad(r.label, 16) + 'ERROR: ' + r.error); continue; }
  const status = r.problems.length ? 'FAIL — ' + r.problems.join('; ') : 'ok';
  console.log(pad(r.vpName, 10) + pad(r.label, 16) + pad(r.size, 10) + pad(r.gapAbove, 8) + pad(r.gapBelow, 8) + pad(r.delta, 7) + pad(r.centerDelta, 7) + status);
}
console.log('-'.repeat(110));

// Guard against the check silently passing on ONE locale thirty times, which is
// exactly what happened when the localStorage env segment was guessed wrong:
// every language rendered the German default and every row agreed, which reads
// identical to real cross-language coverage. Compare the headline actually
// rendered per language and fail if the copy never changed.
const mobileRows = results.filter((r) => r.vpName === 'mobile' && !r.error);
const distinctHeadlines = new Set(mobileRows.map((r) => r.headline));
console.log(`distinct headlines rendered across ${mobileRows.length} languages: ${distinctHeadlines.size}`);
for (const r of mobileRows) console.log(`   ${pad(r.label, 16)} ${r.headline}`);
if (distinctHeadlines.size < Math.min(8, mobileRows.length)) {
  console.log('FAIL — the language never actually changed; this run proves nothing about other locales');
  failures++;
}

console.log(failures === 0 ? `PASS — ${results.length} checks, no collisions, symmetric everywhere` : `FAIL — ${failures} of ${results.length} checks`);
console.log(`screenshots: ${OUT}`);
process.exit(failures === 0 ? 0 : 1);
