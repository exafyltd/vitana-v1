/**
 * VTID-04514 (Community Autopilot CA-9): four Autopilot tables that were never
 * written are dropped (supabase/migrations/20260924220000_vtid_04514_…).
 * No source may query them again. Autopilot state lives in
 * autopilot_recommendations; automation runs in automation_runs.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const DEAD = ['autopilot_actions', 'autopilot_action_templates', 'automation_executions', 'autopilot_feedback'];
const QUERY = new RegExp(`(from\\(|table:\\s*)['"\`](${DEAD.join('|')})['"\`]`);

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (entry === 'node_modules') continue;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js)$/.test(entry) && !full.endsWith('integrations/supabase/types.ts')) out.push(full);
  }
}

describe('dropped Autopilot tables (VTID-04514)', () => {
  it('no app or edge-function source queries them', () => {
    const files: string[] = [];
    walk('src', files);
    walk('supabase/functions', files);
    const hits = files.filter((f) => QUERY.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });

  it('the drop migration refuses a table that has rows', () => {
    const sql = readFileSync('supabase/migrations/20260924220000_vtid_04514_drop_dead_autopilot_tables.sql', 'utf8');
    expect(sql).toMatch(/RAISE EXCEPTION/);
    for (const t of DEAD) expect(sql).toContain(`DROP TABLE IF EXISTS public.${t};`);
    // autopilot_feedback references autopilot_actions: it must go first.
    expect(sql.indexOf('public.autopilot_feedback;')).toBeLessThan(sql.indexOf('public.autopilot_actions;'));
  });
});
