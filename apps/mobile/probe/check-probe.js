/**
 * VTID-05183 — assertions on the core probe bundles (NATIVE-CI mobile job):
 *  (a) no production host string from src/config/env.ts in the bundle
 *  (b) no sourcemap source under the repo-root node_modules
 *  (c) exactly one `react` package in the sourcemap
 *   node probe/check-probe.js probe-dist/ios.js probe-dist/android.js
 */
const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.resolve(__dirname, '..');
const REPO_DIR = path.resolve(MOBILE_DIR, '../..');
const REPO_NODE_MODULES = path.join(REPO_DIR, 'node_modules') + path.sep;

/**
 * Expo's serializer writes sources relative to the project root with a
 * leading slash ("/node_modules/react/index.js", "/../../packages/…"); a
 * real absolute path (inside the repo) is kept as is.
 */
function sourcePath(s) {
  if (s.startsWith(REPO_DIR + path.sep)) return s;
  if (s.startsWith('/')) return path.join(MOBILE_DIR, s);
  return null; // virtual modules (__prelude__, \0polyfill:…)
}
const FORBIDDEN = [
  { what: 'the production Supabase project ref', rx: /inmkhvwdcuyhnxkgfvsb/ },
  { what: 'the production gateway host', rx: /gateway\.vitanaland\.com/ },
  { what: 'vitanaland.com as a URL host', rx: /\/\/(www\.)?vitanaland\.com(?![\w-])/ },
];

function check(bundlePath) {
  const problems = [];
  const text = fs.readFileSync(bundlePath, 'utf8');
  for (const f of FORBIDDEN) {
    const m = f.rx.exec(text);
    if (m) problems.push(`(a) ${f.what}: "${text.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, ' ')}"`);
  }
  const map = JSON.parse(fs.readFileSync(`${bundlePath}.map`, 'utf8'));
  const sources = (map.sources || []).map(sourcePath).filter(Boolean);
  if (!sources.some((s) => s.startsWith(path.join(REPO_DIR, 'packages', 'core') + path.sep))) problems.push('the sourcemap holds no packages/core source — not a core probe bundle');
  const fromRoot = sources.filter((s) => s.startsWith(REPO_NODE_MODULES));
  if (fromRoot.length) problems.push(`(b) ${fromRoot.length} source(s) from the repo-root node_modules, e.g. ${fromRoot[0]}`);
  const reactRoots = new Set();
  for (const s of sources) {
    const m = /^(.*[\\/]node_modules[\\/]react)[\\/]/.exec(s);
    if (m) reactRoots.add(m[1]);
  }
  if (reactRoots.size !== 1) problems.push(`(c) expected exactly one react package, found ${reactRoots.size}: ${[...reactRoots].join(', ') || 'none'}`);
  return { problems, bytes: text.length, sources: sources.length };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node probe/check-probe.js <bundle.js> [...]');
  process.exit(2);
}
let failed = false;
for (const f of files) {
  const r = check(f);
  if (r.problems.length) {
    failed = true;
    console.error(`${f}:\n  - ${r.problems.join('\n  - ')}`);
  } else console.log(`${f}: ok (${r.bytes} bytes, ${r.sources} sources, no production host, one react, nothing from the root node_modules)`);
}
process.exit(failed ? 1 : 0);
