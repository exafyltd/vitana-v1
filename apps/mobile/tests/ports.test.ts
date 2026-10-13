/**
 * VTID-05186 (N3, plan changes 2 + 20–21) — lane code only through src/ports,
 * and the stub-removal rule.
 *
 * 1. No shell, auth, identity, screen, navigation, theme or route file imports
 *    a lane package (`@vitana/*`, N2's `src/ui`, `packages/`) — only `src/ports/*`.
 * 2. A `*.stub.ts(x)` file is imported by its own port file and nothing else,
 *    and starts with a `// STUB(N1|N2): replace with …` header.
 * 3. Stub removal: once the lane a stub waits for is on the branch (N1:
 *    packages/core, packages/tokens; N2: apps/mobile/src/ui), the stub must be
 *    gone. On this branch, before N1/N2 merge, rule 3 holds trivially; after the
 *    rebase onto a main that has N1, it fails until the port points at
 *    @vitana/core and the stub is deleted — so no hand copy reaches main.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';

const APP = join(__dirname, '..');
const REPO = join(APP, '../..');

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...files(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const importsOf = (file: string) => [...readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);
const rel = (f: string) => relative(APP, f).split('\\').join('/');

const SHELL_DIRS = ['src/shell', 'src/auth', 'src/identity', 'src/screens', 'src/navigation', 'src/theme', 'src/i18n', 'src/config', 'app'];
const shellFiles = SHELL_DIRS.flatMap((d) => files(join(APP, d)));
const portFiles = files(join(APP, 'src/ports'));
const stubs = portFiles.filter((f) => /\.stub\.tsx?$/.test(f));

/** Where each stub's lane lands; its presence means the stub must be gone. */
const AWAITS: Record<string, string[]> = {
  N1: ['packages/core/package.json', 'packages/tokens/package.json'],
  N2: ['apps/mobile/src/ui/index.ts'],
};

describe('lane code only through src/ports', () => {
  it('finds the shell files', () => {
    expect(shellFiles.length).toBeGreaterThan(40);
  });

  it.each(shellFiles.map(rel))('%s imports no lane package directly', (file) => {
    const bad = importsOf(join(APP, file)).filter((s) => /^@vitana\//.test(s) || /(^|\/)packages\//.test(s) || /(^|\/)src\/ui(\/|$)/.test(s) || /^(\.\.\/)+ui(\/|$)/.test(s) || /\.stub$/.test(s) || /\.stub\.tsx?$/.test(s));
    expect(bad).toEqual([]);
  });
});

describe('stubs', () => {
  it('every stub is imported only by its own port file', () => {
    const everything = [...shellFiles, ...portFiles, ...files(join(APP, 'tests'))];
    for (const stub of stubs) {
      const base = stub.replace(/\.tsx?$/, '');
      const importers = everything.filter((f) => f !== stub && importsOf(f).some((s) => s.startsWith('.') && resolve(dirname(f), s) === base));
      const port = base.replace(/\.stub$/, '');
      expect({ stub: rel(stub), importers: importers.map(rel) }).toEqual({ stub: rel(stub), importers: importers.filter((f) => f.replace(/\.tsx?$/, '') === port).map(rel) });
      expect(importers.map((f) => f.replace(/\.tsx?$/, ''))).toContain(port);
    }
  });

  it.each(stubs.map(rel))('%s carries a STUB(N1|N2) header naming its replacement', (file) => {
    const first = readFileSync(join(APP, file), 'utf8').split('\n')[0];
    expect(first).toMatch(/^\/\/ STUB\((N1|N2)\): replace with .+ — awaits /);
  });

  it('stub removal: no stub remains once the lane it waits for is on the branch', () => {
    const lingering = stubs
      .map((f) => ({ file: rel(f), lane: /STUB\((N\d)\)/.exec(readFileSync(f, 'utf8'))?.[1] ?? '?' }))
      .filter(({ lane }) => (AWAITS[lane] ?? []).some((p) => existsSync(join(REPO, p))));
    expect(lingering).toEqual([]);
  });
});
