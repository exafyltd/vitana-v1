/**
 * VTID-03763 — useOrbVoiceWidget.ts relays onGuidedTopicTeachingEnd as a
 * window CustomEvent, in both places `navOpts` is constructed (initial auth
 * resolution, and the auth-change reinit effect) — a real user can log in
 * or switch accounts mid My-Journey-tap, so both init paths must carry the
 * same wiring or the reinit path silently drops it.
 *
 * This hook has heavy external dependencies (Supabase auth, the injected
 * `window.VitanaOrb` script, React Router) that make a full render test
 * expensive and brittle; static source extraction is the pattern this
 * codebase already uses for the equivalent orb-widget.js checks (see
 * guided-topic-teaching-complete-signal.test.ts in vitana-platform).
 */
import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(__dirname, './useOrbVoiceWidget.ts');
const source = fs.readFileSync(HOOK_PATH, 'utf8');

// Both navOpts object literals in this file declare `showFab: true` as their
// first property — use it to split the file into "before first navOpts" /
// "first navOpts through second navOpts" / "second navOpts onward".
const navOptsStarts: number[] = [];
let searchFrom = 0;
for (;;) {
  const idx = source.indexOf('const navOpts = {', searchFrom);
  if (idx === -1) break;
  navOptsStarts.push(idx);
  searchFrom = idx + 1;
}

describe('VTID-03763: onGuidedTopicTeachingEnd is wired in useOrbVoiceWidget.ts', () => {
  it('declares exactly two navOpts object literals (main init + auth-change reinit)', () => {
    expect(navOptsStarts.length).toBe(2);
  });

  it('both navOpts objects declare onGuidedTopicTeachingEnd', () => {
    const [firstStart, secondStart] = navOptsStarts;
    const firstBlock = source.slice(firstStart, secondStart);
    const secondBlock = source.slice(secondStart, secondStart + 2000);
    expect(firstBlock).toMatch(/onGuidedTopicTeachingEnd:/);
    expect(secondBlock).toMatch(/onGuidedTopicTeachingEnd:/);
  });

  it('dispatches the vitana:guided-topic-teaching-complete CustomEvent with {topicId, reason} in both call sites', () => {
    const occurrences = source.match(
      /new CustomEvent\("vitana:guided-topic-teaching-complete",\s*\{\s*detail:\s*\{\s*topicId,\s*reason\s*\}\s*\}\)/g,
    );
    expect(occurrences).not.toBeNull();
    expect(occurrences!.length).toBe(2);
  });

  it('dispatches on window, not some other target (so a listener anywhere in the tree can catch it)', () => {
    const idx = source.indexOf('onGuidedTopicTeachingEnd:');
    expect(idx).toBeGreaterThan(-1);
    const nearby = source.slice(idx, idx + 300);
    expect(nearby).toMatch(/window\.dispatchEvent\(/);
  });
});
