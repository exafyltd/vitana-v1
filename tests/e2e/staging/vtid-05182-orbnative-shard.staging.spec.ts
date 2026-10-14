// VTID-05182 — native app N6d: the new i18n shard `orbNative.json` ships in the
// web build (staging, read-only, signed out, 390x844).
//
// The keys are used by the native app (apps/mobile: ORB overlay, microphone
// rationale, iOS microphone usage string, dev echo bench), not by any web
// screen, so nothing on the page renders them. The spec reads the app's own
// runtime catalog, exactly as the VTID-05186 native-shard spec does: the
// entry chunk exports `catalogs` (lazy screen chunks import it), so a dynamic
// import of the entry URL the page already loaded returns the SAME, already
// evaluated module. Fallbacks, in this order, when the export shape changes:
//   - de: the composed `de` catalog object, also exported by the entry chunk;
//   - ar: the `locale-ar-*.js` chunk the page fetched, imported in the page
//     (its exports are the shard module namespaces, `default.orbNative`).
// If none is reachable the test fails, never passes empty.
//
// Checks:
//   1. in `de` and in `ar`, the loaded catalog holds a parseable `orbNative`
//      namespace with exactly the 44 expected keys, every value a non-empty
//      string, every placeholder kept ({rate}, {count}, {value}), and `ar` not
//      equal to `de` (the shard is translated, not a copy);
//   2. the web app is unchanged: `/` loads in de, en and ar with the right
//      html[dir] and no raw `orbNative.` key anywhere in the page text.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write to
// a gateway or Supabase. This spec does not sign in and clicks nothing; the
// language is chosen through browser localStorage only (the same keys the
// language picker writes for a signed-out visitor), never a server write. The
// ORB widget script is stubbed, so no ORB session can start.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 390, height: 844 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const EXPECTED_KEYS = [
  'a11y.close',
  'a11y.micMute',
  'a11y.micUnmute',
  'a11y.restart',
  'bench.aecPath',
  'bench.barges',
  'bench.device',
  'bench.fail',
  'bench.intro',
  'bench.modeEcho',
  'bench.modeSpeech',
  'bench.noiseFloor',
  'bench.noisyRoom',
  'bench.off',
  'bench.on',
  'bench.openings',
  'bench.os',
  'bench.pass',
  'bench.peak',
  'bench.phaseIdle',
  'bench.phaseNoiseFloor',
  'bench.phasePlaying',
  'bench.rate',
  'bench.route',
  'bench.share',
  'bench.start',
  'bench.stop',
  'bench.stopLatency',
  'bench.title',
  'bench.unavailable',
  'bench.voiceProcessing',
  'denied.body',
  'denied.openSettings',
  'micUsageDescription',
  'rationale.body',
  'rationale.continue',
  'rationale.notNow',
  'rationale.title',
  'status.connecting',
  'status.ended',
  'status.muted',
  'status.reconnecting',
  'status.thinking',
  'status.unavailable',
];

/** Placeholder each templated key must keep. */
const PLACEHOLDERS: Record<string, string> = {
  'bench.rate': '{rate}',
  'bench.openings': '{count}',
  'bench.barges': '{count}',
  'bench.peak': '{value}',
  'bench.noiseFloor': '{value}',
  'bench.stopLatency': '{value}',
  'bench.device': '{value}',
  'bench.os': '{value}',
  'bench.route': '{value}',
  'bench.aecPath': '{value}',
  'bench.voiceProcessing': '{value}',
};

type Lang = { code: 'de' | 'en' | 'ar'; value: string; dir: 'ltr' | 'rtl'; readShard: boolean };
const LANGS: Lang[] = [
  { code: 'de', value: 'de-DE', dir: 'ltr', readShard: true },
  { code: 'en', value: 'en-US', dir: 'ltr', readShard: false },
  { code: 'ar', value: 'ar-XA', dir: 'rtl', readShard: true },
];

/** Leaf keys of a namespace, `_`-prefixed bookkeeping (e.g. `_pending_review`) excluded. */
function leaves(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, leaves(v as Record<string, unknown>, path));
    else out[path] = v;
  }
  return out;
}

async function stubOrb(page: import('@playwright/test').Page) {
  await page.route(/orb-widget\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
}

/**
 * Reads `orbNative` for one locale from the running app. Passed to the page as
 * a string so the test runner's TypeScript transform never rewrites `import()`.
 * Returns { source, ns } or { source: 'none', why }.
 */
function readShardScript(entryUrl: string, catalogKey: string, chunkUrl: string): string {
  return `(async () => {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const deadline = Date.now() + 20000;
    let why = 'entry chunk not imported';
    while (Date.now() < deadline) {
      try {
        const ns = await import(${JSON.stringify(entryUrl)});
        const values = Object.values(ns);
        const catalogs = values.find((v) => isObj(v) && isObj(v['de-DE']) && 'ar-XA' in v && isObj(v['de-DE'].orbNative));
        if (catalogs && isObj(catalogs[${JSON.stringify(catalogKey)}]) && isObj(catalogs[${JSON.stringify(catalogKey)}].orbNative)) {
          return { source: 'catalogs', ns: catalogs[${JSON.stringify(catalogKey)}].orbNative };
        }
        if (${JSON.stringify(catalogKey)} === 'de-DE') {
          const de = values.find((v) => isObj(v) && isObj(v.orbNative) && isObj(v.orbNative.status) && !('de-DE' in v));
          if (de) return { source: 'de-export', ns: de.orbNative };
        }
        why = catalogs ? 'catalogs found, ' + ${JSON.stringify(catalogKey)} + ' has no orbNative namespace yet' : 'no catalogs export on the entry chunk';
      } catch (e) {
        why = 'entry import failed: ' + String(e);
      }
      if (${JSON.stringify(chunkUrl)}) {
        try {
          const mod = await import(${JSON.stringify(chunkUrl)});
          const shard = Object.values(mod).find((v) => isObj(v) && isObj(v.default) && isObj(v.default.orbNative));
          if (shard) return { source: 'locale-chunk', ns: shard.default.orbNative };
          why += '; locale chunk has no orbNative shard';
        } catch (e) {
          why += '; locale chunk import failed: ' + String(e);
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return { source: 'none', why };
  })()`;
}

test('VTID-05182: the orbNative i18n shard ships in de and ar with 44 keys; / unchanged in de, en, ar (signed out, read-only)', async ({ page }) => {
  test.setTimeout(150_000);
  await stubOrb(page);

  const found: Record<string, Record<string, unknown>> = {};

  for (const lang of LANGS) {
    // Choose the language the way the picker stores it for a signed-out visitor
    // (LanguageContext: namespaced `selected_language` + the `vitana.lang`
    // mirror). Browser-local only.
    await page.addInitScript((value) => {
      try {
        for (const env of ['dev', 'staging', 'prod']) {
          localStorage.setItem(`vitana::global::${env}::language::selected_language`, value);
        }
        localStorage.setItem('vitana.lang', value);
      } catch {
        /* storage blocked: the assertions below fail with a clear message */
      }
    }, lang.value);

    let chunkUrl = '';
    const onResponse = (res: import('@playwright/test').Response) => {
      if (new RegExp(`/assets/locale-${lang.code}-[^/]+\\.js$`).test(res.url())) chunkUrl = res.url();
    };
    page.on('response', onResponse);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 2. The web app is unchanged: direction follows the language, no orbNative key leaks into the page.
    await expect(page.locator('html'), `/ in ${lang.code}: html[dir]`).toHaveAttribute('dir', lang.dir, { timeout: 20_000 });
    const text = await page.locator('body').innerText();
    expect(text, `/ in ${lang.code}: a raw orbNative key leaked into the page`).not.toContain('orbNative.');

    if (lang.readShard) {
      const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
      expect(entry, 'no entry chunk (/assets/index-*.js) on /').toBeTruthy();
      if (lang.code === 'ar') {
        await expect.poll(() => chunkUrl, { message: 'the ar locale chunk was not fetched', timeout: 20_000 }).not.toBe('');
      }
      const res = (await page.evaluate(readShardScript(entry, lang.value, chunkUrl))) as { source: string; ns?: Record<string, unknown>; why?: string };

      // 1. The shard is in the loaded bundle, parseable, with exactly the expected keys.
      expect(res.source, `${lang.code}: orbNative namespace not reachable (${res.why ?? ''})`).not.toBe('none');
      const flat = leaves(res.ns ?? {});
      expect(Object.keys(flat).sort(), `${lang.code}: orbNative keys (read from ${res.source})`).toEqual(EXPECTED_KEYS);
      for (const [k, v] of Object.entries(flat)) {
        expect(typeof v === 'string' && v.trim().length > 0, `${lang.code}: orbNative.${k} is a non-empty string`).toBe(true);
      }
      for (const [k, ph] of Object.entries(PLACEHOLDERS)) {
        expect(String(flat[k]), `${lang.code}: orbNative.${k} keeps ${ph}`).toContain(ph);
      }
      found[lang.code] = flat;
    }
    page.off('response', onResponse);

    await test.info().attach(`root-${lang.code}`, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
  }

  // The ar shard is a translation, not a copy of the German one.
  for (const k of EXPECTED_KEYS) {
    expect(found.ar[k], `ar orbNative.${k} differs from de`).not.toBe(found.de[k]);
  }
});
