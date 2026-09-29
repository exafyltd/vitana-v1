/**
 * VTID-04502 — publish the screen registry with the build.
 *
 * Merges src/navigation/registry/screens.json with the per-language title
 * files into public/nav-registry.json, which Vite copies into dist/ and the
 * app serves at /nav-registry.json. The gateway reads it from the frontend it
 * is paired with (staging from staging, production from production), so the
 * screens Vitana can open are always the screens that build can render —
 * no second copy of the list to keep in sync by hand.
 *
 * Runs as `prebuild` (so `npm run build`, the Dockerfile and the PR preview
 * build all publish it) and standalone via `npm run nav:registry`.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REG = path.join(ROOT, 'src', 'navigation', 'registry');
const OUT = path.join(ROOT, 'public', 'nav-registry.json');
const TRANSLATED = ['es', 'fr', 'sr', 'pl', 'pt', 'ru', 'tr', 'ar', 'zh'];

export function buildRegistry() {
  const { version, screens } = JSON.parse(fs.readFileSync(path.join(REG, 'screens.json'), 'utf8'));
  const locales = Object.fromEntries(
    TRANSLATED.map((l) => [l, JSON.parse(fs.readFileSync(path.join(REG, 'locales', `${l}.json`), 'utf8'))]),
  );
  return {
    version,
    generated_at: new Date().toISOString(),
    commit: process.env.VITE_APP_VERSION || process.env.GITHUB_SHA || null,
    screens: screens.map((s) => ({
      ...s,
      i18n: {
        ...s.i18n,
        ...Object.fromEntries(TRANSLATED.filter((l) => locales[l][s.id]).map((l) => [l, locales[l][s.id]])),
      },
    })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const reg = buildRegistry();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(reg));
  console.log(`[nav-registry] ${reg.screens.length} screens → ${path.relative(ROOT, OUT)}`);
}
