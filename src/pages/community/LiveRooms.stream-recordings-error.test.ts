/**
 * LiveRooms.tsx — handleDeletePastRoom() stream_recordings lookup error
 * visibility + abort.
 *
 * The `stream_recordings` storage-path lookup previously destructured only
 * `{ data: recs }`, never checking `error`. A real DB failure resolved
 * `recs` to `null` — indistinguishable from "this stream genuinely has no
 * recordings" — so `paths` came out empty and the function skipped straight
 * to `deleteStream()`, which deletes the DB row (and thus the "permanently
 * deleted" claim) while leaving the actual recording file still publicly
 * reachable at its old URL.
 *
 * Fixed: `error` is now checked. On a real error, the function logs loudly,
 * shows the existing error toast, and returns BEFORE calling `deleteStream()`
 * — aborting the whole delete rather than silently leaving an orphaned
 * public file.
 *
 * LiveRooms.tsx has no existing render-test harness for this handler
 * (SplitBar/GoLivePopup/room-list entanglement); per this repo's own
 * established pattern, this pins the fix at the source level.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, 'LiveRooms.tsx'), 'utf8');

describe('LiveRooms — handleDeletePastRoom() stream_recordings error handling', () => {
  it('destructures `error` from the stream_recordings lookup, not just `data`', () => {
    expect(SRC).toMatch(
      /const \{ data: recs, error: recsError \} = await supabase\s*\n\s*\.from\('stream_recordings'\)/
    );
  });

  it('aborts before computing paths or calling deleteStream on a real error', () => {
    const idx = SRC.indexOf("const { data: recs, error: recsError } = await supabase");
    expect(idx).toBeGreaterThan(-1);
    const after = SRC.slice(idx, idx + 1400);

    expect(after).toMatch(/if \(recsError\) \{/);
    expect(after).toContain('console.error(');
    expect(after).toContain("notifyError('toasts.community.error');");

    const errIdx = after.indexOf('if (recsError) {');
    const returnIdx = after.indexOf('return;', errIdx);
    const pathsIdx = after.indexOf('const paths = (recs ?? [])');
    const deleteStreamIdx = after.indexOf('await deleteStream(streamId);');

    expect(returnIdx).toBeGreaterThan(errIdx);
    expect(returnIdx).toBeLessThan(pathsIdx);
    expect(pathsIdx).toBeGreaterThan(-1);
    expect(deleteStreamIdx).toBeGreaterThan(pathsIdx);
  });

  it('does not call deleteStream(streamId) from inside the error branch itself', () => {
    const idx = SRC.indexOf('if (recsError) {');
    const closeIdx = SRC.indexOf('const paths = (recs ?? [])');
    const errorBranch = SRC.slice(idx, closeIdx);
    expect(errorBranch).not.toContain('deleteStream(streamId)');
  });
});
