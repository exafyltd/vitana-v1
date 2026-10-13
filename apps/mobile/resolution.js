/**
 * VTID-05183 — the ONE alias table and resolver of the native app (Native app
 * Wave 1 N1, plan change 2). Metro (metro.config.js), Jest (jest.config.js)
 * and the tests use this file; tsconfig.json `paths` mirror ALIASES (a test
 * checks they are equal).
 *
 *   @vitana/core/*  → packages/core/src/*
 *   @vitana/tokens  → packages/tokens/src/index.ts
 *   @/*             → src/*   (the web src/; only core's re-export files use it —
 *                              ESLint bans it in app code)
 *
 * Rules:
 *  - Bare specifiers ALWAYS resolve from apps/mobile/node_modules, for every
 *    importer (also files under src/ and packages/), so a developer's root
 *    node_modules (React 18, the web's tree) can never be picked up. A
 *    resolution that lands in the repo-root node_modules throws.
 *  - Guard: a file under the repo's src/ resolves only when it is listed in
 *    packages/core/closure.generated.json (`node scripts/native/core-closure.mjs
 *    --write`), or is one of the web i18n catalog shards the Wave 0 catalog
 *    map reads (src/i18n/<locale>/*.json). Anything else throws, naming the
 *    module. The web Supabase client and gateway base (both fall back to
 *    production) are never in that list.
 */
const fs = require('fs');
const path = require('path');

const MOBILE_DIR = __dirname;
const REPO_DIR = path.resolve(MOBILE_DIR, '../..');
const MOBILE_NODE_MODULES = path.join(MOBILE_DIR, 'node_modules');
const ROOT_NODE_MODULES = path.join(REPO_DIR, 'node_modules');
const WEB_SRC = path.join(REPO_DIR, 'src');
const CLOSURE_FILE = path.join(REPO_DIR, 'packages/core/closure.generated.json');

/** Alias → repo-relative target. `*` is a single wildcard, as in tsconfig `paths`. */
const ALIASES = {
  '@vitana/core/*': 'packages/core/src/*',
  '@vitana/tokens': 'packages/tokens/src/index.ts',
  '@/*': 'src/*',
};

/** Bare packages packages/core imports; tsconfig `paths` points them into ./node_modules (type resolution). */
const CORE_PACKAGES = ['@supabase/supabase-js'];

/** Web i18n shards the Wave 0 catalog map requires (scripts/native/gen-i18n-map.mjs). */
const I18N_SHARD = /^src\/i18n\/[^/]+\/[^/]+\.json$/;

const posix = (p) => p.split(path.sep).join('/');

/** Absolute target path (without extension resolution) for an aliased specifier, or null. */
function aliasTarget(spec) {
  for (const [from, to] of Object.entries(ALIASES)) {
    if (from.endsWith('/*')) {
      const prefix = from.slice(0, -1);
      if (spec.startsWith(prefix)) return path.join(REPO_DIR, to.slice(0, -1) + spec.slice(prefix.length));
    } else if (spec === from) {
      return path.join(REPO_DIR, to);
    }
  }
  return null;
}

let closureCache = null;
function closureSet() {
  if (closureCache) return closureCache;
  let data = { files: [], assets: [] };
  try {
    data = JSON.parse(fs.readFileSync(CLOSURE_FILE, 'utf8'));
  } catch {
    // Missing closure file: nothing under src/ is admitted (fail closed).
  }
  closureCache = new Set([...(data.files || []), ...(data.assets || [])]);
  return closureCache;
}

function isBare(spec) {
  return !spec.startsWith('.') && !path.isAbsolute(spec) && aliasTarget(spec) === null;
}

/** Throws unless `file` may be bundled. */
function assertAllowed(file, request) {
  const abs = path.resolve(file);
  if (abs === ROOT_NODE_MODULES || abs.startsWith(ROOT_NODE_MODULES + path.sep)) {
    throw new Error(
      `[@vitana/mobile resolver] "${request}" resolved to ${posix(path.relative(REPO_DIR, abs))} in the repo-root node_modules. ` +
        'Native code resolves every package from apps/mobile/node_modules only (VTID-05183): add it to apps/mobile/package.json.',
    );
  }
  if (abs.startsWith(WEB_SRC + path.sep)) {
    const rel = posix(path.relative(REPO_DIR, abs));
    if (!closureSet().has(rel) && !I18N_SHARD.test(rel)) {
      throw new Error(
        `[@vitana/mobile resolver] ${rel} (requested as "${request}") is not part of @vitana/core. ` +
          'Native code reaches web code only through @vitana/core: add a re-export and a line in packages/core/manifest.json, ' +
          'then run `node scripts/native/core-closure.mjs --write` (VTID-05183).',
      );
    }
  }
  return file;
}

/** Metro `resolver.resolveRequest`. */
function metroResolveRequest(context, moduleName, platform) {
  const target = aliasTarget(moduleName);
  let ctx = context;
  if (target === null && isBare(moduleName)) {
    // Packages' own nested node_modules (a dependency pinned per package) still
    // need hierarchical lookup; every other importer — app code, src/, packages/ —
    // only sees apps/mobile/node_modules.
    const origin = path.resolve(context.originModulePath);
    if (origin.startsWith(MOBILE_NODE_MODULES + path.sep)) ctx = { ...context, disableHierarchicalLookup: false };
    else ctx = { ...context, disableHierarchicalLookup: true, nodeModulesPaths: [MOBILE_NODE_MODULES] };
  }
  const res = context.resolveRequest(ctx, target === null ? moduleName : target, platform);
  if (res && res.type === 'sourceFile') assertAllowed(res.filePath, moduleName);
  if (res && res.type === 'assetFiles') for (const f of res.filePaths) assertAllowed(f, moduleName);
  return res;
}

/** Jest `resolver` (wraps the React Native preset's resolver). */
function jestResolver(request, options) {
  const target = aliasTarget(request);
  let opts = options;
  let req = target === null ? request : target;
  if (target === null && isBare(request)) {
    const base = path.resolve(options.basedir);
    if (!base.startsWith(MOBILE_NODE_MODULES + path.sep)) opts = { ...options, basedir: MOBILE_DIR, paths: [MOBILE_NODE_MODULES] };
  }
  let rnResolver;
  try {
    rnResolver = require(require.resolve('@react-native/jest-preset/jest/resolver.js', { paths: [MOBILE_DIR] }));
  } catch {
    rnResolver = (r, o) => o.defaultResolver(r, o);
  }
  const file = rnResolver(req, opts);
  return assertAllowed(file, request);
}

module.exports = {
  ALIASES,
  CORE_PACKAGES,
  MOBILE_DIR,
  REPO_DIR,
  aliasTarget,
  assertAllowed,
  metroResolveRequest,
  jestResolver,
  /** Jest loads `resolver` modules as `{ sync }` when the export is not a function. */
  sync: jestResolver,
  _resetForTests() {
    closureCache = null;
  },
};
