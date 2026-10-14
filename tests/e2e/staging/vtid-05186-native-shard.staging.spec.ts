// VTID-05186 — native app N3, PR-K: the new i18n shard `native.json` ships in
// the web build (staging, read-only, signed out, 390x844).
//
// The keys are used by the native app (apps/mobile), not by any web screen, so
// nothing on the page renders them. The spec reads the app's own runtime
// catalog instead: the entry chunk exports `catalogs` (lazy screen chunks
// import it), so a dynamic import of the entry URL the page already loaded
// returns the SAME, already evaluated module — no second copy, no request
// beyond a cached GET. Fallbacks, in this order, when the export shape changes:
//   - de: the composed `de` catalog object, also exported by the entry chunk;
//   - ar: the `locale-ar-*.js` chunk the page fetched, imported in the page
//     (its exports are the shard module namespaces, `default.native`).
// If none is reachable the test fails, never passes empty.
//
// Checks:
//   1. in `de` and in `ar`, the loaded catalog holds a parseable `native`
//      namespace with exactly the 9 expected keys, every value a non-empty
//      string, `{count}` kept in the three a11y labels, and `ar` not equal to
//      `de` (the shard is translated, not a copy);
//   2. RTL unchanged: on /maxina `html[dir]` is `ltr` for de and `rtl` for ar.
//
// Read-only: './staging-guard' (copied in by the runner) aborts every write to
// a gateway or Supabase. This spec does not sign in and clicks nothing; the
// language is chosen through browser localStorage only (the same keys the
// language picker writes for a signed-out visitor), never a server write.
import { test, expect } from './staging-guard';

test.use({
  viewport: { width: 390, height: 844 },
  allowAbortedWrites:
    / https:\/\/(preview-aws-gateway\.vitanaland\.com\/api\/v1\/(rum\/beacon|diag\/notif-tap|analytics\/events\/batch)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/rest\/v1\/(thread_presence|user_activity_log)|inmkhvwdcuyhnxkgfvsb\.supabase\.co\/(rest\/v1\/rpc\/[a-z_]+|functions\/v1\/(list_my_memberships|generate-daily-matches))|preview-aws-gateway\.vitanaland\.com\/api\/v1\/orb\/)/,
});

const EXPECTED_KEYS = [
  'a11y.openCart',
  'a11y.openNotifications',
  'a11y.unread',
  'adminInBrowser.body',
  'adminInBrowser.title',
  'configMissing.body',
  'configMissing.title',
  'unported.body',
  'unported.title',
];
const COUNT_KEYS = ['a11y.unread', 'a11y.openNotifications', 'a11y.openCart'];

type Lang = { code: 'de' | 'ar'; value: string; dir: 'ltr' | 'rtl' };
const LANGS: Lang[] = [
  { code: 'de', value: 'de-DE', dir: 'ltr' },
  { code: 'ar', value: 'ar-XA', dir: 'rtl' },
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
 * Reads `native` for one locale from the running app. Passed to the page as a
 * string so the test runner's TypeScript transform never rewrites `import()`.
 * Returns { source, native } or { source: 'none', why }.
 */
function readNativeScript(entryUrl: string, catalogKey: string, chunkUrl: string): string {
  return `(async () => {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const deadline = Date.now() + 20000;
    let why = 'entry chunk not imported';
    while (Date.now() < deadline) {
      try {
        const ns = await import(${JSON.stringify(entryUrl)});
        const values = Object.values(ns);
        const catalogs = values.find((v) => isObj(v) && isObj(v['de-DE']) && 'ar-XA' in v && isObj(v['de-DE'].native));
        if (catalogs && isObj(catalogs[${JSON.stringify(catalogKey)}]) && isObj(catalogs[${JSON.stringify(catalogKey)}].native)) {
          return { source: 'catalogs', native: catalogs[${JSON.stringify(catalogKey)}].native };
        }
        if (${JSON.stringify(catalogKey)} === 'de-DE') {
          const de = values.find((v) => isObj(v) && isObj(v.native) && isObj(v.native.unported) && !('de-DE' in v));
          if (de) return { source: 'de-export', native: de.native };
        }
        why = catalogs ? 'catalogs found, ' + ${JSON.stringify(catalogKey)} + ' has no native namespace yet' : 'no catalogs export on the entry chunk';
      } catch (e) {
        why = 'entry import failed: ' + String(e);
      }
      if (${JSON.stringify(chunkUrl)}) {
        try {
          const mod = await import(${JSON.stringify(chunkUrl)});
          const shard = Object.values(mod).find((v) => isObj(v) && isObj(v.default) && isObj(v.default.native));
          if (shard) return { source: 'locale-chunk', native: shard.default.native };
          why += '; locale chunk has no native shard';
        } catch (e) {
          why += '; locale chunk import failed: ' + String(e);
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return { source: 'none', why };
  })()`;
}

test('VTID-05186: the native i18n shard ships in de and ar with 9 keys; /maxina direction unchanged (signed out, read-only)', async ({ page }) => {
  test.setTimeout(120_000);
  await stubOrb(page);

  const found: Record<string, Record<string, unknown>> = {};

  // Choose the language the way the picker stores it for a signed-out visitor
  // (LanguageContext: namespaced `selected_language` + the `vitana.lang`
  // mirror). Browser-local only. ONE init script for the whole test: it reads
  // the wanted value from this navigation's own `e2eLang` query parameter, so
  // no earlier locale's script can race it (Playwright leaves the order of
  // several addInitScript calls undefined).
  await page.addInitScript(() => {
    try {
      const value = new URLSearchParams(location.search).get('e2eLang');
      if (!value) return;
      for (const env of ['dev', 'staging', 'prod']) {
        localStorage.setItem(`vitana::global::${env}::language::selected_language`, value);
      }
      localStorage.setItem('vitana.lang', value);
    } catch {
      /* storage blocked: the assertions below fail with a clear message */
    }
  });

  for (const lang of LANGS) {
    let chunkUrl = '';
    const onResponse = (res: import('@playwright/test').Response) => {
      if (new RegExp(`/assets/locale-${lang.code}-[^/]+\\.js$`).test(res.url())) chunkUrl = res.url();
    };
    page.on('response', onResponse);

    await page.goto(`/maxina?e2eLang=${encodeURIComponent(lang.value)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 2. Direction follows the language, as before this change.
    await expect(page.locator('html'), `/maxina in ${lang.code}: html[dir]`).toHaveAttribute('dir', lang.dir, { timeout: 20_000 });

    const entry = await page.evaluate(() => [...document.scripts].map((x) => x.src).find((x) => x.includes('/assets/index-')) ?? '');
    expect(entry, 'no entry chunk (/assets/index-*.js) on /maxina').toBeTruthy();

    if (lang.code === 'ar') {
      await expect.poll(() => chunkUrl, { message: 'the ar locale chunk was not fetched', timeout: 20_000 }).not.toBe('');
    }

    const res = (await page.evaluate(readNativeScript(entry, lang.value, chunkUrl))) as {
      source: string;
      native?: Record<string, unknown>;
      why?: string;
    };
    page.off('response', onResponse);

    // 1. The shard is in the loaded bundle, parseable, with exactly the expected keys.
    expect(res.source, `${lang.code}: native namespace not reachable (${res.why ?? ''})`).not.toBe('none');
    const flat = leaves(res.native ?? {});
    expect(Object.keys(flat).sort(), `${lang.code}: native keys (read from ${res.source})`).toEqual(EXPECTED_KEYS);
    for (const [k, v] of Object.entries(flat)) {
      expect(typeof v === 'string' && v.trim().length > 0, `${lang.code}: native.${k} is a non-empty string`).toBe(true);
    }
    for (const k of COUNT_KEYS) {
      expect(String(flat[k]), `${lang.code}: native.${k} keeps {count}`).toContain('{count}');
    }
    found[lang.code] = flat;

    await testInfoAttach(page, `maxina-${lang.code}`);
  }

  // The ar shard is a translation, not a copy of the German one.
  for (const k of EXPECTED_KEYS) {
    expect(found.ar[k], `ar native.${k} differs from de`).not.toBe(found.de[k]);
  }
});

async function testInfoAttach(page: import('@playwright/test').Page, name: string) {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: false }), contentType: 'image/png' });
}
