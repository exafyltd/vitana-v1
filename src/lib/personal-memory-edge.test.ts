/**
 * VTID-04453: the legacy edge functions read memory_items, not ai_memory.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  toPersonalMemoryRows,
  fetchPersonalMemory,
  byConfidence,
} from '../../supabase/functions/_shared/personal-memory';

const T1 = '2026-09-20T08:00:00Z';
const T2 = '2026-09-22T08:00:00Z';

describe('toPersonalMemoryRows', () => {
  it('keeps episodes in the old ai_memory row shape and skips raw turns', () => {
    const rows = toPersonalMemoryRows([
      { id: 'a', category_key: 'health_wellness', source: 'session_summary', content: 'Knee hurt', content_json: {}, importance: 40, provenance_confidence: null, occurred_at: T1 },
      { id: 'b', category_key: 'conversation', source: 'orb_text', content: 'hi', content_json: { direction: 'user' }, importance: 20, occurred_at: T2 },
      { id: 'c', category_key: 'conversation', source: 'orb_text', content: 'hello', content_json: { direction: 'assistant' }, importance: 20, occurred_at: T2 },
      { id: 'd', category_key: 'notes', source: 'upload', content: 'Garden note', content_json: { kind: 'garden_note' }, importance: 70, provenance_confidence: 0.9, occurred_at: T2 },
      { id: 'e', category_key: 'notes', source: 'upload', content: '   ', content_json: {}, importance: 70, occurred_at: T2 },
    ]);
    expect(rows.map(r => r.id)).toEqual(['a', 'd']);
    expect(rows[0]).toMatchObject({ memory_type: 'health_wellness', confidence_score: 0.4, created_at: T1, content: 'Knee hurt' });
    expect(rows[1]).toMatchObject({ memory_type: 'garden_note', confidence_score: 0.9 });
  });
});

describe('byConfidence', () => {
  it('orders by confidence, then newest', () => {
    const rows = toPersonalMemoryRows([
      { id: 'low', category_key: 'x', content: 'l', content_json: {}, importance: 30, occurred_at: T2 },
      { id: 'hiOld', category_key: 'x', content: 'h', content_json: {}, importance: 80, occurred_at: T1 },
      { id: 'hiNew', category_key: 'x', content: 'h', content_json: {}, importance: 80, occurred_at: T2 },
    ]);
    expect(byConfidence(rows).map(r => r.id)).toEqual(['hiNew', 'hiOld', 'low']);
  });
});

describe('fetchPersonalMemory', () => {
  function client(rows: any[], error: any = null) {
    const calls: any[] = [];
    const b: any = {};
    for (const m of ['from', 'select', 'eq', 'is', 'gte', 'order', 'limit']) {
      b[m] = (...a: any[]) => { calls.push([m, ...a]); return b; };
    }
    b.then = (res: any) => Promise.resolve({ data: rows, error }).then(res);
    return { b, calls };
  }

  it('reads memory_items, personal rows only, never ai_memory', async () => {
    const { b, calls } = client([{ id: 'a', category_key: 'x', content: 'c', content_json: {}, importance: 50, occurred_at: T1 }]);
    const r = await fetchPersonalMemory(b, 'u1', { limit: 5, sinceIso: T1 });
    expect(r.data).toHaveLength(1);
    expect(calls).toContainEqual(['from', 'memory_items']);
    expect(calls).toContainEqual(['eq', 'user_id', 'u1']);
    expect(calls).toContainEqual(['is', 'active_role', null]);
    expect(calls).toContainEqual(['gte', 'occurred_at', T1]);
    expect(calls.some(c => c[0] === 'from' && c[1] === 'ai_memory')).toBe(false);
  });

  it('returns an empty list and the error when the read fails', async () => {
    const { b } = client([], { message: 'boom' });
    const r = await fetchPersonalMemory(b, 'u1');
    expect(r).toEqual({ data: [], error: { message: 'boom' } });
  });
});

describe('no edge function touches ai_memory (tree guard)', () => {
  it('no source under supabase/functions reads or writes ai_memory', async () => {
    const { readdirSync, readFileSync, statSync, existsSync } = await import('fs');
    const { join } = await import('path');
    expect(existsSync('supabase/functions/analyze-visual-context')).toBe(false);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.ts$/.test(entry) && /from\(\s*['"]ai_memory['"]\s*\)/.test(readFileSync(full, 'utf8'))) offenders.push(full);
      }
    };
    walk('supabase/functions');
    walk('src');
    expect(offenders).toEqual([]);
    expect(readFileSync('supabase/config.toml', 'utf8')).not.toContain('[functions.analyze-visual-context]');
  });
});
