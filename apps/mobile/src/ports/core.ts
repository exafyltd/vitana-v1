/**
 * VTID-05186 (N3, plan changes 2 + 20–21) — the ONE door to N1's `@vitana/core`.
 *
 * Every shell, auth and identity file imports N1 code from here, never from
 * a lane package directly (tests/ports.test.ts). Until N1 (VTID-05183)
 * merges, the names come from the branch-only `./core.stub`; the swap is
 * this one line — `export * from '@vitana/core/…'` per subpath — and the
 * stub is deleted in the same commit, before PR-S merges.
 */
export * from './core.stub';
