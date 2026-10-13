/**
 * VTID-05182 — web code in the native app (N6d, plan Change 19): exactly two
 * files, through exact `@web/…` aliases that Metro, jest and tsc agree on.
 * Every other web import stays banned (ESLint no-restricted-imports; any
 * other `@web/…` specifier does not resolve).
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WEB_ALIASES, resolveWebAlias } = require('../../web-aliases') as {
  WEB_ALIASES: Record<string, string>;
  resolveWebAlias: (m: string) => string | null;
};
const MOBILE = join(__dirname, '../..');
const REPO = join(MOBILE, '../..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('@web aliases', () => {
  it('name exactly orb-navigation.ts and orb-view-profile.ts', () => {
    expect(Object.fromEntries(Object.entries(WEB_ALIASES).map(([k, v]) => [k, relative(REPO, v)]))).toEqual({
      '@web/navigation/orb-navigation': 'src/navigation/orb-navigation.ts',
      '@web/lib/orb-view-profile': 'src/lib/orb-view-profile.ts',
    });
  });

  it('tsconfig paths mirror them', () => {
    const tsconfig = JSON.parse(readFileSync(join(MOBILE, 'tsconfig.json'), 'utf8')) as { compilerOptions: { paths: Record<string, string[]> } };
    const paths = Object.fromEntries(Object.entries(tsconfig.compilerOptions.paths).map(([k, [v]]) => [k, join(MOBILE, v)]));
    expect(paths).toEqual(WEB_ALIASES);
  });

  it('the Metro resolver step serves them, refuses any other @web specifier, and passes everything else on', () => {
    for (const [alias, file] of Object.entries(WEB_ALIASES)) expect(resolveWebAlias(alias)).toBe(file);
    expect(() => resolveWebAlias('@web/integrations/supabase/client')).toThrow(/not an allowed web import/);
    expect(resolveWebAlias('react-native')).toBeNull();
    expect(readFileSync(join(MOBILE, 'metro.config.js'), 'utf8')).toMatch(/resolveWebAlias\(moduleName\)/);
  });

  it('the web files import nothing but the registry', () => {
    const nav = readFileSync(WEB_ALIASES['@web/navigation/orb-navigation'], 'utf8');
    expect([...nav.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])).toEqual(['./registry']);
    const profile = readFileSync(WEB_ALIASES['@web/lib/orb-view-profile'], 'utf8');
    expect(/^\s*import\s/m.test(profile)).toBe(false);
  });

  it('app code reaches web files only through those aliases', () => {
    const offenders: string[] = [];
    for (const file of [...walk(join(MOBILE, 'src')), ...walk(join(MOBILE, 'app'))].filter((f) => /\.(ts|tsx)$/.test(f))) {
      for (const m of readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)) {
        const spec = m[1];
        if (spec.startsWith('@web/') && !(spec in WEB_ALIASES)) offenders.push(`${relative(MOBILE, file)}: ${spec}`);
        if (spec.startsWith('.')) {
          const target = resolve(dirname(file), spec);
          const outside = relative(MOBILE, target).startsWith('..');
          if (outside && !target.startsWith(join(REPO, 'src/i18n'))) offenders.push(`${relative(MOBILE, file)}: ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
