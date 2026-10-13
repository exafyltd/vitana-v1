/**
 * VTID-05186 (N3, plan changes 2 + 20–21) — the ONE door to N1's `@vitana/core`.
 *
 * Every shell, auth and identity file imports N1 code from here, never from
 * a lane package directly (tests/ports.test.ts). Until N1 (VTID-05183)
 * merges, the names come from the branch-only `./core.stub`; the swap is
 * this one line — `export * from '@vitana/core/…'` per subpath — and the
 * stub is deleted in the same commit, before PR-S merges.
 *
 * Names mirror N1 as pushed (branch …-n1, commit 6c179f53d). One open
 * request (I-N1.1): N1's createSupabaseClient has no `auth.flowType` option
 * yet. Either N1 adds that optional field (preferred, additive), or the swap
 * keeps `createSupabaseClient` here as a wrapper with N1's exact option set
 * plus `flowType`; every other name is a plain re-export.
 */
export * from './core.stub';
