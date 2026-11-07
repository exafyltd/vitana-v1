/**
 * VTID-05461 — the My Journey payload types (src/hooks/useMyJourney.ts), the
 * ring countdown model (src/lib/journeyRing.ts: buildJourneyRing) and the
 * goal-plan types + schedule trend (src/hooks/useGoalPlan.ts,
 * src/lib/goalTrend.ts: computeGoalTrend). IO-free.
 *
 * Generated verbatim through packages/core/extract.json (NOT `export * from
 * '@/lib/journeyRing'`): journeyRing.ts and goalTrend.ts `import type` their
 * shapes from useMyJourney.ts / useGoalPlan.ts, which are class-B hooks
 * (community gateway, auth, React Query); copying the declarations keeps
 * those files out of the native strict TS program. The native hooks are
 * re-implemented in apps/mobile/src/screens/journey/data.
 */
export * from './extracted/journey.generated';
