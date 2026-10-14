/** VTID-05183 — the one resolver: bare packages from apps/mobile/node_modules only, the src/ guard, the alias table. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, isAbsolute, join, resolve, sep } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const resolution = require('../../resolution.js');

const MOBILE = resolve(__dirname, '../..');
const REPO = resolve(MOBILE, '../..');
const MOBILE_NM = join(MOBILE, 'node_modules') + sep;

const EXT = ['', '.ts', '.tsx', '.js', '.json', '/index.ts', '/index.js'];
const isFile = (f: string) => existsSync(f) && statSync(f).isFile();

/**
 * A plain hierarchical node_modules resolver (the algorithm Jest's default
 * resolver follows): walk up from `basedir`, take the first node_modules/<pkg>.
 * Jest's own require.resolve cannot be used here — it would go through the
 * resolver under test.
 */
function nodeDefaultResolver(request: string, options: { basedir: string }): string {
  if (isAbsolute(request)) {
    for (const e of EXT) if (isFile(request + e)) return request + e;
    throw new Error(`Cannot find module '${request}'`);
  }
  const name = request.startsWith('@') ? request.split('/').slice(0, 2).join('/') : request.split('/')[0];
  for (let dir = resolve(options.basedir); ; dir = dirname(dir)) {
    const pkgDir = join(dir, 'node_modules', name);
    if (existsSync(join(pkgDir, 'package.json'))) {
      const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
      const main = join(pkgDir, pkg['react-native'] && typeof pkg['react-native'] === 'string' ? pkg['react-native'] : pkg.main || 'index.js');
      for (const e of EXT) if (isFile(main + e)) return main + e;
    }
    if (dirname(dir) === dir) throw new Error(`Cannot find module '${request}' from ${options.basedir}`);
  }
}

const resolveFrom = (request: string, basedir: string) =>
  resolution.jestResolver(request, { basedir, defaultResolver: nodeDefaultResolver, rootDir: MOBILE }) as string;

describe('bare specifiers resolve from apps/mobile/node_modules', () => {
  let tmp: string;
  beforeAll(() => {
    // A fixture file under a temp "src/" with a decoy node_modules/react next to it:
    // plain Node resolution from there would pick the decoy.
    tmp = mkdtempSync(join(tmpdir(), 'vitana-resolution-'));
    mkdirSync(join(tmp, 'src'), { recursive: true });
    mkdirSync(join(tmp, 'node_modules/react'), { recursive: true });
    writeFileSync(join(tmp, 'node_modules/react/package.json'), JSON.stringify({ name: 'react', version: '18.3.1', main: 'index.js' }));
    writeFileSync(join(tmp, 'node_modules/react/index.js'), 'module.exports = "decoy";');
    writeFileSync(join(tmp, 'src/fixture.ts'), 'export {};');
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it.each(['react', '@supabase/supabase-js'])('%s from a fixture under src/', (pkg) => {
    expect(nodeDefaultResolver('react', { basedir: join(tmp, 'src') })).toBe(join(tmp, 'node_modules/react/index.js'));
    const file = resolveFrom(pkg, join(tmp, 'src'));
    expect(file.startsWith(MOBILE_NM)).toBe(true);
  });

  it('react from the web src/ and from packages/core resolves into apps/mobile too', () => {
    expect(resolveFrom('react', join(REPO, 'src/navigation')).startsWith(MOBILE_NM)).toBe(true);
    expect(resolveFrom('react', join(REPO, 'packages/core/src')).startsWith(MOBILE_NM)).toBe(true);
  });

  it('a resolution into the repo-root node_modules throws', () => {
    expect(() => resolution.assertAllowed(join(REPO, 'node_modules/react/index.js'), 'react')).toThrow(/repo-root node_modules/);
  });
});

describe('the src/ guard', () => {
  it.each(['src/integrations/supabase/client.ts', 'src/lib/gateway-base.ts', 'src/App.tsx'])('%s throws', (rel) => {
    expect(() => resolution.assertAllowed(join(REPO, rel), rel)).toThrow(/not part of @vitana\/core/);
    expect(() => resolveFrom(`@/${rel.slice(4).replace(/\.tsx?$/, '')}`, MOBILE)).toThrow(/not part of @vitana\/core/);
  });

  it('closure files, closure assets and i18n shards are admitted', () => {
    expect(resolution.assertAllowed(join(REPO, 'src/navigation/registry/index.ts'), 'x')).toBeTruthy();
    expect(resolution.assertAllowed(join(REPO, 'src/assets/flags/de.png'), 'x')).toBeTruthy();
    expect(resolution.assertAllowed(join(REPO, 'src/i18n/de/common.json'), 'x')).toBeTruthy();
    expect(() => resolution.assertAllowed(join(REPO, 'src/assets/flags/us.png'), 'x')).toThrow(/not part of @vitana\/core/);
  });

  it('aliases map to packages/ and src/', () => {
    expect(resolution.aliasTarget('@vitana/core/roles')).toBe(join(REPO, 'packages/core/src/roles'));
    expect(resolution.aliasTarget('@vitana/tokens')).toBe(join(REPO, 'packages/tokens/src/index.ts'));
    expect(resolution.aliasTarget('@/lib/permissions')).toBe(join(REPO, 'src/lib/permissions'));
    expect(resolution.aliasTarget('react')).toBeNull();
  });
});

describe('tsconfig paths equal the resolution.js alias table', () => {
  it('same keys, same targets', () => {
    const tsconfig = JSON.parse(readFileSync(join(MOBILE, 'tsconfig.json'), 'utf8'));
    const paths: Record<string, string[]> = tsconfig.compilerOptions.paths;
    const aliasPaths = Object.fromEntries(Object.entries(paths).filter(([k]) => !resolution.CORE_PACKAGES.includes(k)));
    const expected = Object.fromEntries(Object.entries(resolution.ALIASES as Record<string, string>).map(([k, v]) => [k, [`../../${v}`]]));
    expect(aliasPaths).toEqual(expected);
    for (const pkg of resolution.CORE_PACKAGES as string[]) expect(paths[pkg]).toEqual([`./node_modules/${pkg}`]);
  });
});
