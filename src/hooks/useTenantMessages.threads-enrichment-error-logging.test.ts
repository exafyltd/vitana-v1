/**
 * useTenantMessages.ts — threads query allParticipants/lastMessage error-visibility fix.
 *
 * The `tenant-threads` queryFn destructured only `{ data: allParticipants }`
 * (thread_participants enrichment) and `{ data: lastMessage }` (`.single()`
 * on messages) without ever checking `error`, unlike its own sibling
 * queries one level up in the same function (`partErr`, `threadError`,
 * both already `throw`n). On a real Postgres failure both silently
 * resolved to `undefined`/`null` — participants list empty, last_message
 * null — indistinguishable from "this thread genuinely has no
 * participants/messages yet".
 *
 * Fixed: both now also destructure `error` and log it via `console.error`.
 * Per the explicit fix spec for this call site, this LOGS rather than
 * throws — throwing `allParticipantsError` would fail the ENTIRE thread
 * list (already successfully fetched) over an enrichment-only failure, and
 * throwing `lastMessageError` inside the per-thread `Promise.all` map would
 * fail every OTHER thread's enrichment too. `lastMessage`'s `.single()` has
 * a legitimate PGRST116 (no rows: thread has zero messages) case, matching
 * this repo's own `error.code !== "PGRST116"` convention (see
 * useMemoryMetadata.ts / useEventSales.ts) — that case is excluded from
 * logging. Neither fallback changed.
 *
 * useTenantMessages.ts has no existing render-test harness (react-query +
 * auth-context + realtime-channel entanglement); per this repo's own
 * established pattern (see useTenantMessages.new-thread-fetch-error.test.ts,
 * the sibling fix in this exact file), this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useTenantMessages.ts'), 'utf8');

describe('useTenantMessages — threads query allParticipants error logging', () => {
  it('destructures `error` from the thread_participants enrichment query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: allParticipants, error: allParticipantsError \} = await supabase\s*\n\s*\.from\('thread_participants'\)/
    );
  });

  it('logs the error before the unchanged deduplicatedParticipants usage', () => {
    const idx = SRC.indexOf("error: allParticipantsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 700);
    expect(after).toMatch(/if \(allParticipantsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain('const deduplicatedParticipants = (allParticipants || [])');
    const errIdx = after.indexOf('if (allParticipantsError) {');
    const useIdx = after.indexOf('const deduplicatedParticipants = (allParticipants || [])');
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});

describe('useTenantMessages — per-thread lastMessage error logging', () => {
  it('destructures `error` from the last-message `.single()` query, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: lastMessage, error: lastMessageError \} = await supabase\s*\n\s*\.from\('messages'\)/
    );
  });

  it('excludes PGRST116 (no messages yet) from being logged as an error', () => {
    const idx = SRC.indexOf("error: lastMessageError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 500);
    expect(after).toMatch(/if \(lastMessageError && lastMessageError\.code !== 'PGRST116'\) \{/);
    expect(after).toContain('console.error(');

    // Unchanged downstream usage — checked against the whole source since it
    // sits further down in the same per-thread map callback than a small
    // fixed window can safely capture.
    expect(SRC).toContain('last_message: lastMessage,');
    const errIdx = SRC.indexOf("if (lastMessageError && lastMessageError.code !== 'PGRST116') {");
    const useIdx = SRC.indexOf('last_message: lastMessage,');
    expect(errIdx).toBeGreaterThan(-1);
    expect(useIdx).toBeGreaterThan(errIdx);
  });
});
