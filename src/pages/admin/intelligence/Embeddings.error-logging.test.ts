/**
 * Embeddings.tsx admin dashboard — factsQuery() error-visibility fix.
 *
 * Neither the total nor active `memory_facts` count read checked `error`
 * — a real DB failure rendered as "0 total / 0 active facts" on the admin
 * Intelligence dashboard, with nothing logged. The sibling `totalQuery`/
 * `categoriesQuery` in this same file already `throw error` on failure;
 * `factsQuery` was the one inconsistent read.
 *
 * Fixed: both counts now throw on error too, matching the rest of the
 * file (react-query then surfaces `factsQuery.isError`).
 *
 * Pinned at the source level — this page has no existing render-test
 * harness, matching this repo's established precedent for admin
 * dashboard query files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'Embeddings.tsx'), 'utf8');

describe('Embeddings (admin) — factsQuery error handling', () => {
  it('throws on the total memory_facts count error, matching the sibling totalQuery/categoriesQuery', () => {
    const idx = SRC.indexOf('const { count: total, error: totalError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 300);
    expect(after).toContain('.from("memory_facts")');
    expect(after).toContain('if (totalError) throw totalError;');
  });

  it('throws on the active memory_facts count error too', () => {
    const idx = SRC.indexOf('const { count: active, error: activeError }');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 300);
    expect(after).toContain('.from("memory_facts")');
    expect(after).toContain('if (activeError) throw activeError;');
  });
});
