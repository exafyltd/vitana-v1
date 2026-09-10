/**
 * useGlobalMessages.ts — fetchLegacyThreads() allParticipants/lastMessages error-visibility fix.
 *
 * `fetchLegacyThreads()` already checks `error` correctly on its FIRST two
 * queries in the same function — `partErr` (global_thread_participants)
 * and `threadErr` (global_message_threads) — both logging via
 * `console.warn` and returning `[]` on failure. But the next two queries in
 * the exact same function, `allParticipants` (all participants across
 * threads) and `lastMessages` (last message per thread), destructured only
 * `{ data }`, never `error` — an inconsistency within one function, not a
 * different judgment call.
 *
 * Fixed: matches the SAME handling as the sibling `threadErr` check
 * (`if (err || !data) { console.warn(...); return []; }`) — for
 * consistency within this function, per the fix spec for this call site.
 *
 * Pinned at the source level, matching this repo's established pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useGlobalMessages.ts'), 'utf8');

describe('useGlobalMessages — fetchLegacyThreads() allParticipants error logging', () => {
  it('destructures `error` from the global_thread_participants (all participants) query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: allParticipants, error: allPartErr \} = await supabase\s*\n\s*\.from\("global_thread_participants"\)/
    );
  });

  it('matches the sibling threadErr handling: warns and returns [] on failure', () => {
    const idx = SRC.indexOf('error: allPartErr } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 400);
    expect(after).toMatch(/if \(allPartErr \|\| !allParticipants\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('return [];');

    // Same shape as the existing threadErr check.
    const threadErrIdx = SRC.indexOf('if (threadErr || !threadRows) {');
    expect(threadErrIdx).toBeGreaterThan(-1);
  });
});

describe('useGlobalMessages — fetchLegacyThreads() lastMessages error logging', () => {
  it('destructures `error` from the global_messages (last messages) query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: lastMessages, error: lastMsgErr \} = await supabase\s*\n\s*\.from\("global_messages"\)/
    );
  });

  it('matches the sibling threadErr handling: warns and returns [] on failure', () => {
    const idx = SRC.indexOf('error: lastMsgErr } = await supabase');
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 600);
    expect(after).toMatch(/if \(lastMsgErr \|\| !lastMessages\) \{/);
    expect(after).toContain('console.warn(');
    expect(after).toContain('return [];');
  });

  it('the error checks happen before the downstream lastMsgByThread grouping', () => {
    const errIdx = SRC.indexOf('if (lastMsgErr || !lastMessages) {');
    const useIdx = SRC.indexOf('const lastMsgByThread');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
