/**
 * useLiveStreams.ts's `fetchEndedStreams()` — stream_recordings hydration
 * error-visibility fix.
 *
 * The recordings-hydration query previously destructured only
 * `{ data: recordings }`, never checking `error`. A real DB failure
 * resolved `recordings` to `null`, collapsed to `[]` — indistinguishable
 * from "none of these ended streams were recorded" — so every ended
 * stream's recording would silently disappear from the Past tab with
 * nothing in the console pointing at a DB failure having occurred.
 *
 * Fixed: `error` is now destructured and logged via `console.error`. This
 * is a read/display path (the stream list itself already succeeded above),
 * so per the fix spec this logs and degrades rather than throwing/aborting
 * the whole query.
 *
 * Pinned at the source level — this hook has no existing render-test
 * harness, matching this file's sibling error-logging fixes elsewhere in
 * this repo (e.g. useRealMatches.daily-matches-error-logging.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useLiveStreams.ts'), 'utf8');

describe('useLiveStreams — fetchEndedStreams() recordings-hydration error logging', () => {
  it('destructures `error` from the stream_recordings query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: recordings, error: recordingsError \} = await supabase\s*\n\s*\.from\('stream_recordings'\)/
    );
  });

  it('logs the error before the unchanged recByStream fallback usage', () => {
    const idx = SRC.indexOf("const { data: recordings, error: recordingsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1000);

    expect(after).toMatch(/if \(recordingsError\) \{/);
    expect(after).toContain('console.error(');
    // Unchanged fallback shape.
    expect(after).toContain("const recByStream = new Map<string, StreamRecording>();");
    expect(after).toContain('for (const r of (recordings || []) as StreamRecording[]) {');

    const errIdx = after.indexOf('if (recordingsError) {');
    const useIdx = after.indexOf('const recByStream = new Map<string, StreamRecording>();');
    expect(useIdx).toBeGreaterThan(errIdx);
  });

  it('does not throw or return early on a recordings-hydration error (log-only, degrade gracefully)', () => {
    const idx = SRC.indexOf('if (recordingsError) {');
    const after = SRC.slice(idx, idx + 300);
    const closeIdx = after.indexOf('}');
    const body = after.slice(0, closeIdx);
    expect(body).not.toContain('throw');
    expect(body).not.toContain('return');
  });
});
