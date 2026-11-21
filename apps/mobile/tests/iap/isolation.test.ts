// VTID-05680 — nothing is wired: no dependency added, nothing outside src/iap imports the module.
import fs from 'fs';
import path from 'path';

const MOBILE = path.resolve(__dirname, '../..');
const IAP_DIR = path.join(MOBILE, 'src/iap');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('isolation', () => {
  it('src/iap exists', () => {
    expect(fs.existsSync(path.join(IAP_DIR, 'index.ts'))).toBe(true);
  });

  it('package.json has no purchase-related dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(MOBILE, 'package.json'), 'utf8'));
    const names = Object.keys({
      ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies,
    });
    expect(names.filter((n) => /iap|billing|storekit|revenuecat|purchases/i.test(n))).toEqual([]);
  });

  it('no file under src or app outside src/iap imports the module', () => {
    const spec = /(?:from|import|require\()\s*['"]([^'"]+)['"]/g;
    const offenders: string[] = [];
    const files = [...walk(path.join(MOBILE, 'src')), ...walk(path.join(MOBILE, 'app'))]
      .filter((f) => !f.startsWith(IAP_DIR + path.sep));
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(spec)) {
        const s = m[1];
        if (!s.startsWith('.') && !s.startsWith('@/') && !s.startsWith('src/')) continue;
        const target = s.startsWith('.')
          ? path.resolve(path.dirname(f), s)
          : path.resolve(MOBILE, s.replace(/^@\//, 'src/'));
        if (target === IAP_DIR || target.startsWith(IAP_DIR + path.sep)) offenders.push(`${path.relative(MOBILE, f)} -> ${s}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
