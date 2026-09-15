/**
 * useMemoryMetadata.ts — refreshMetadataMutation() swallowed-error /
 * data-corrupting-write bug.
 *
 * `refreshMetadataMutation`'s `mutationFn` previously destructured only
 * `{ data: aiMemories }` from the `ai_memory` select and `{ data: diaryEntries }`
 * from the `diary_entries` select, never checking `error`. On a real DB
 * failure, supabase-js resolves normally with `{ data: null, error: {...} }` —
 * both destructures silently became `undefined`, which the subsequent
 * `aiMemories?.forEach(...)` / `diaryEntries?.forEach(...)` treated
 * identically to "this user genuinely has zero memories/diary entries".
 *
 * That zeroed `categoryProgress`/`total_memories_count: 0` was then WRITTEN
 * via `.update()` into `user_memory_metadata` — permanently overwriting the
 * user's real accumulated Memory Garden progress on what may have been a
 * purely transient fetch failure. This is a data-corrupting write, not just
 * a display bug.
 *
 * Fixed: both selects now check their `error`, log it, and `throw` before
 * any category-progress computation or `.update()` write happens — aborting
 * the mutation so the existing `onError` handler (and React Query's own
 * `isError`/`error` mutation state) reports the failure instead of silently
 * "succeeding" with a wrong, zeroed write.
 *
 * useMemoryMetadata.ts has no existing render-test harness for this mutation
 * (it's driven through React Query, not a component prop chain); per this
 * repo's own established pattern (see useCalendarEvents.error-logging-abort.test.ts),
 * this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useMemoryMetadata.ts'), 'utf8');

describe('useMemoryMetadata — refreshMetadataMutation() ai_memory fetch error handling', () => {
  it('destructures `error` from the ai_memory select, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: aiMemories, error: aiMemoriesError \} = await supabase\s*\n\s*\.from\("ai_memory"\)/
    );
  });

  it('logs and throws on ai_memory error, before any category-progress computation', () => {
    const idx = SRC.indexOf('const { data: aiMemories, error: aiMemoriesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(aiMemoriesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw aiMemoriesError;');

    // The throw must happen BEFORE the diary_entries fetch and BEFORE the
    // categoryMemories computation / forEach loops that would otherwise
    // treat undefined data as "zero memories".
    const throwIdx = SRC.indexOf('throw aiMemoriesError;');
    const diaryFetchIdx = SRC.indexOf('const { data: diaryEntries');
    const forEachIdx = SRC.indexOf('aiMemories?.forEach');
    expect(diaryFetchIdx).toBeGreaterThan(throwIdx);
    expect(forEachIdx).toBeGreaterThan(throwIdx);
  });
});

describe('useMemoryMetadata — refreshMetadataMutation() diary_entries fetch error handling', () => {
  it('destructures `error` from the diary_entries select, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: diaryEntries, error: diaryEntriesError \} = await supabase\s*\n\s*\.from\("diary_entries"\)/
    );
  });

  it('logs and throws on diary_entries error, before the update() write', () => {
    const idx = SRC.indexOf('const { data: diaryEntries, error: diaryEntriesError } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(diaryEntriesError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('throw diaryEntriesError;');

    // The throw must happen BEFORE the user_memory_metadata .update() call
    // that would otherwise write a zeroed total_memories_count/category_progress.
    const throwIdx = SRC.indexOf('throw diaryEntriesError;');
    const updateIdx = SRC.indexOf('.from("user_memory_metadata")\n        .update(');
    expect(updateIdx).toBeGreaterThan(throwIdx);
  });
});

describe('useMemoryMetadata — refreshMetadataMutation() surfaces failure instead of silently succeeding', () => {
  it('has an onError handler on refreshMetadataMutation logging the abort', () => {
    const mutationIdx = SRC.indexOf('const refreshMetadataMutation = useMutation({');
    expect(mutationIdx).toBeGreaterThan(-1);
    const mutationBlock = SRC.slice(mutationIdx, mutationIdx + 4000);
    expect(mutationBlock).toContain('onError: (error) => {');
    expect(mutationBlock).toContain('console.error(');
  });
});
