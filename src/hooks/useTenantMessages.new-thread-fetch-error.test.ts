/**
 * useTenantMessages.ts — createThread() new-thread fetch-back error fix.
 *
 * `createThread()`'s direct-thread branch creates the thread via the
 * `create_tenant_direct_thread` RPC (already correctly checked: `if
 * (rpcError) throw rpcError;`), then re-fetches the row it just created by
 * id — `const { data: thread } = await supabase.from('message_threads')
 * .select('*').eq('id', threadId).maybeSingle();` — and returned `thread`
 * (i.e. `undefined` on any failure) without ever checking `error`.
 *
 * Consequence: if that fetch-back query failed (RLS hiccup, transient DB
 * error, replica lag), the RPC had *already* created the thread — the
 * write succeeded — but the caller received `undefined` as if thread
 * creation itself had failed, with nothing in the console explaining the
 * mismatch between "the thread exists in the DB" and "the caller was told
 * nothing came back".
 *
 * Fixed: the query now also destructures `error` and throws it, matching
 * this exact function's own established pattern one statement above it
 * (`if (rpcError) throw rpcError;`) and two statements below it in the
 * group-thread branch (`if (threadError) throw threadError;` /
 * `if (participantsError) throw participantsError;`) — `createThread()`
 * is already wrapped in a try/catch that logs via `console.error` and
 * re-throws, so this surfaces exactly like every other failure mode in
 * this function already does, with no new control flow introduced.
 *
 * useTenantMessages.ts (react-query + auth-context + realtime-channel
 * entanglement, no existing render-test harness) is pinned at the source
 * level, matching this repo's own useTenant.error-logging.test.ts /
 * useAdminCommunity.error-surfacing.test.ts precedent for exactly this
 * class of fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'useTenantMessages.ts'), 'utf8');

describe('useTenantMessages — createThread() new-thread fetch-back error handling', () => {
  it('destructures `error` from the post-creation message_threads fetch, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: thread, error: fetchThreadError \} = await supabase\s*\n\s*\.from\('message_threads'\)/
    );
  });

  it('throws the error before returning `thread`, matching the sibling rpcError/threadError/participantsError checks in the same function', () => {
    const idx = SRC.indexOf("error: fetchThreadError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 300);

    expect(after).toContain('if (fetchThreadError) throw fetchThreadError;');
    expect(after).toContain('return thread;');

    const throwIdx = after.indexOf('if (fetchThreadError) throw fetchThreadError;');
    const returnIdx = after.indexOf('return thread;');
    expect(returnIdx).toBeGreaterThan(throwIdx);
  });

  it('the direct-thread branch still awaits fetchThreads() before returning, unchanged', () => {
    const idx = SRC.indexOf("error: fetchThreadError } = await supabase");
    const before = SRC.slice(Math.max(0, idx - 200), idx);
    expect(before).toContain('await fetchThreads();');
  });
});
