/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — the Vitana Index
 * tier math (src/lib/vitanaIndex.ts): the six tiers, the tier of a score, the
 * next tier and the points to it, percentage and zero-padded formatting.
 * Pure, IO-free. The native health snapshot, chips and Index sheet (and the
 * biology / Index-detail lane) use it exactly as the web does.
 */
export * from '@/lib/vitanaIndex';
