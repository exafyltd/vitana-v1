/** Shared Partner Portal presentation helpers (VTID-03546). */
export const stateBadgeVariant = (state: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (state === 'active' || state === 'certified') return 'default';
  if (state === 'revoked' || state === 'failed') return 'destructive';
  if (state === 'approval_required' || state === 'authorization_required') return 'outline';
  return 'secondary';
};

/**
 * Connection lifecycle (VTID-03882).
 *
 * Mirror of the gateway's own list — `services/gateway/src/routes/vcaop-portal.ts`
 * in `exafyltd/vitana-platform`, which is itself pinned byte-for-byte against
 * `services/vcaop/src/factory/manifest.ts` by a test there. Stored in
 * `integration_manifest.status`. This copy exists ONLY so the portal can draw a
 * progress track; it is never sent to the server and never decides a transition.
 */
export const CONNECTION_STATES = [
  'discovered',
  'authorization_required',
  'mapping',
  'testing',
  'approval_required',
  'certified',
  'active',
  'degraded',
  'suspended',
  'revoked',
  'failed',
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

/** The four steps a merchant actually sees. Eleven states collapse into these. */
export const CONNECTION_STEPS = ['connect', 'mapping', 'tests', 'live'] as const;

export type ConnectionStep = (typeof CONNECTION_STEPS)[number];

/**
 * Where a state sits on the track, or `null` when the connection is off it.
 *
 * `degraded`/`suspended`/`revoked`/`failed` are deliberately NOT positions on
 * the track: they are things that happened to a connection, and drawing them as
 * "progress" would tell a merchant their revoked connection is 75% of the way
 * to live. The caller renders those from the state badge instead.
 *
 * `certified` reports index 3 (the Live step) but is not `active` — the merchant
 * is done and waiting on the platform's single activation approval, which the
 * `/my` surface deliberately does not expose (gateway `vcaop-portal-my.ts`).
 */
export function connectionStepIndex(state: string): number | null {
  switch (state) {
    case 'discovered':
    case 'authorization_required':
      return 0;
    case 'mapping':
      return 1;
    case 'testing':
    case 'approval_required':
      return 2;
    case 'certified':
    case 'active':
      return 3;
    default:
      return null;
  }
}

/** True once the connection is serving traffic — the only fully-done state. */
export const isConnectionLive = (state: string): boolean => state === 'active';

/** True when the state is a problem rather than a position on the track. */
export const isConnectionOffTrack = (state: string): boolean =>
  connectionStepIndex(state) === null;
