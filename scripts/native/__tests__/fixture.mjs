// VTID-05157 — tiny fixture-tree helper for the scripts/native tests.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function tree(files) {
  const root = mkdtempSync(join(tmpdir(), 'native-fixture-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`);
  }
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
