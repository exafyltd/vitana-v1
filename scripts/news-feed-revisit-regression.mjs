import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exitCode = 1;
  }
}

const hook = readFileSync('src/hooks/useAllNewsFeed.ts', 'utf8');

// Regression guard: the "hold first paint" gate (added to fix articles
// painting before user posts and re-ranking a beat later) must only depend
// on the two CONTENT sources — candidatesQuery and newsQuery. Including
// matchesQuery (a single optional decorative card backed by a slow/flaky
// generate-daily-matches edge-function call) previously blanked the ENTIRE
// already-cached feed back to a full spinner every time the News screen was
// revisited, because matches can legitimately re-enter isLoading on a
// remount without ever having cached data. This is what made a feed the
// user had just looked at "reload from scratch" on every return visit.
assert(
  /const anySourcePending = candidatesQuery\.isLoading \|\| newsQuery\.isLoading;/.test(hook),
  'anySourcePending (the hold-first-paint gate) excludes matchesQuery so an optional decorative source can never blank an already-cached feed',
);
assert(
  !/const anySourcePending =\s*\n?\s*candidatesQuery\.isLoading \|\| matchesQuery\.isLoading \|\| newsQuery\.isLoading;/.test(hook),
  'anySourcePending must not reintroduce matchesQuery into the hold-first-paint gate',
);

if (!process.exitCode) {
  console.log('[news-feed-revisit-regression] OK: matches cannot blank an already-cached feed on revisit.');
}
