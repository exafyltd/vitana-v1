/**
 * VTID-05461 — My Journey horizon bucketing (src/lib/horizonBuckets.ts):
 * bucketFromWaveId, bucketActions, HORIZON_BUCKETS and the HorizonBucket type.
 * Pure, IO-free (its one import is the type-only `@/types/autopilot`, already
 * a core type re-export). The native My Journey screen buckets the onboarding
 * recommendations into "today" with it, exactly like the web dashboard.
 */
export * from '@/lib/horizonBuckets';
