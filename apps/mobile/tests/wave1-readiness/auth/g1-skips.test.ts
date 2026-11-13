/**
 * VTID-05681 (native-wave1-readiness-tests/auth, A6) — readiness evidence only.
 * Does NOT prove the Wave 1 exit (needs G1, NATIVE-APP-PLAN.md §5, :196).
 *
 * Cases that need the isolated test backend G1. They are `it.skip`, never deleted, and are NOT counted toward
 * the Wave 1 exit (listed in docs/validation/VTID-05681/acceptance.md). Bodies are intentionally empty: nothing here
 * may run against a live system.
 */
describe('auth against G1 (skipped; NOT counted toward the Wave 1 exit)', () => {
  // needs G1 (isolated test backend): password sign-in needs the G1 identity provider; no such provider exists before G1
  it.skip('password sign-in against the G1 identity provider returns a session', () => undefined);

  // needs G1 (isolated test backend): a stored session surviving a process restart needs a real session issued by the G1 identity provider and a device/app restart
  it.skip('a session survives an app restart', () => undefined);

  // needs G1 (isolated test backend): token refresh on expiry needs a G1-issued refresh token that the provider can expire
  it.skip('token refresh on expiry against the G1 identity provider', () => undefined);

  // needs G1 (isolated test backend): revoking the server session needs a real server-side session to revoke
  it.skip('sign-out revokes the server session', () => undefined);

  // needs G1 (isolated test backend): Apple and Google end to end need the providers configured on the G1 project (also G2 for the SDK credentials)
  it.skip('Apple and Google sign-in end to end', () => undefined);
});
