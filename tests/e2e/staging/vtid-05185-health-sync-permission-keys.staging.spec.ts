// VTID-05185 — Health Sync OS permission keys ship in every locale (staging, read-only).
//
// Native Wave 1 N5b adds two catalogue keys the native app's config plugin
// resolves into the iOS HealthKit usage text and the Health Connect privacy
// label: screens.nativeHealthSync.osPermission.{iosShareUsage,privacyPolicyTitle}.
// They are unused on the web, so there is nothing to click: this spec checks the
// deployed build itself.
//   - the page's vitana-app-version meta is the commit under verification
//     (when the runner provides SHA);
//   - de is baked into the entry bundle, the other ten locales are the
//     locale-<code>-*.js chunks the entry references (vite.config.ts manualChunks);
//   - each of the 11 catalogues contains both keys with exactly the value
//     committed in src/i18n/<locale>/screens.json at that commit, non-empty.
// './staging-guard' (copied in by the runner) aborts every write. No sign-in,
// GETs of the document and static JS assets only — nothing is clicked or saved.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from './staging-guard';

const LOCALES = ['ar', 'de', 'en', 'es', 'fr', 'pl', 'pt', 'ru', 'sr', 'tr', 'zh'] as const;
const KEYS = ['iosShareUsage', 'privacyPolicyTitle'] as const;

function expected(locale: string): Record<(typeof KEYS)[number], string> {
  const shard = JSON.parse(readFileSync(resolve(process.cwd(), `src/i18n/${locale}/screens.json`), 'utf8'));
  return shard.screens.nativeHealthSync.osPermission;
}

test('the deployed build carries both Health Sync permission keys in all 11 locales', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const version = await page.locator('meta[name="vitana-app-version"]').getAttribute('content');
  const sha = process.env.SHA ?? '';
  if (/^[0-9a-f]{40}$/.test(sha)) expect(version, 'deployed build commit').toBe(sha.slice(0, 12));

  const entryUrl = await page.evaluate(
    () => [...document.scripts].map((s) => s.src).find((src) => src.includes('/assets/index-')) ?? '',
  );
  expect(entryUrl, 'no entry bundle on the page').toBeTruthy();
  const entryRes = await request.get(entryUrl);
  expect(entryRes.status(), 'entry bundle status').toBe(200);
  const entry = await entryRes.text();

  const missing: string[] = [];
  for (const locale of LOCALES) {
    let source = entry;
    if (locale !== 'de') {
      const chunk = entry.match(new RegExp(`locale-${locale}-[A-Za-z0-9_-]+\\.js`))?.[0];
      if (!chunk) {
        missing.push(`${locale}: no locale chunk referenced by the entry bundle`);
        continue;
      }
      const res = await request.get(new URL(`/assets/${chunk}`, entryUrl).toString());
      expect(res.status(), `${locale}: ${chunk} status`).toBe(200);
      source = await res.text();
    }
    const want = expected(locale);
    for (const key of KEYS) {
      const value = want?.[key] ?? '';
      if (!value.trim()) missing.push(`${locale}: ${key} is empty in the committed shard`);
      else if (!source.includes(`${key}:${JSON.stringify(value)}`)) missing.push(`${locale}: ${key} not in the deployed catalogue`);
    }
  }
  expect(missing, 'Health Sync permission keys missing from the deployed build').toEqual([]);
});
