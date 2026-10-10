// VTID-05008 — SUPABASE-FUNCTIONS-RETIRE.yml may delete only the eight memory
// functions the repo already removed (VTID-04448 / VTID-04453). This pins the
// allowlist: exactly those names, none still shipped under supabase/functions/,
// none still called from src/ or supabase/, and the workflow is dispatch-only.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const WORKFLOW = readFileSync(join(ROOT, '.github/workflows/SUPABASE-FUNCTIONS-RETIRE.yml'), 'utf8');

const RETIRED = [
  'ai-chat',
  'search-memories',
  'reinforce-memory',
  'generate-memory-embedding',
  'extract-diary-insights',
  'refresh-memory-metadata',
  'extract-user-interests',
  'analyze-visual-context',
];

function allowlist(): string[] {
  const m = WORKFLOW.match(/ALLOWLIST: >-\n((?: {8}.+\n)+)/);
  expect(m).not.toBeNull();
  return m![1].trim().split(/\s+/);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'node_modules' ? [] : sourceFiles(p);
    return /\.(ts|tsx|js|jsx)$/.test(name) ? [p] : [];
  });
}

describe('SUPABASE-FUNCTIONS-RETIRE allowlist', () => {
  it('is exactly the eight retired memory functions', () => {
    expect(allowlist().sort()).toEqual([...RETIRED].sort());
  });

  it('never names a function the repo still ships', () => {
    for (const fn of allowlist()) expect(existsSync(join(ROOT, 'supabase/functions', fn))).toBe(false);
  });

  it('never names a function something still calls', () => {
    const files = [...sourceFiles(join(ROOT, 'src')), ...sourceFiles(join(ROOT, 'supabase'))];
    for (const fn of allowlist()) {
      const re = new RegExp(`invoke\\(['"]${fn}['"]|functions/v1/${fn}(?![a-z0-9-])`);
      const callers = files.filter((f) => re.test(readFileSync(f, 'utf8')));
      expect(callers).toEqual([]);
    }
  });

  it('runs only on manual dispatch with a reason, and re-checks callers before deleting', () => {
    expect(WORKFLOW).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(WORKFLOW).not.toMatch(/^\s+(push|pull_request|schedule):/m);
    expect(WORKFLOW).toMatch(/reason:\n\s+description:[^\n]*\n\s+required: true/);
    expect(WORKFLOW.indexOf('still has a caller')).toBeLessThan(WORKFLOW.indexOf('supabase functions delete'));
  });
});
