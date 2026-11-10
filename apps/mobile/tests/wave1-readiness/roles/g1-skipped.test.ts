/**
 * VTID-05684 — Wave 1 readiness (roles, R5): cases that need G1 (isolated test backend).
 * Skipped on purpose and NOT counted toward the Wave 1 exit (NATIVE-APP-PLAN.md:196, G1 at :100).
 * Each body states what the G1 run must assert; none runs here.
 */
describe('roles — needs G1', () => {
  // needs G1 (isolated test backend): get_my_permitted_roles must be read from real role-grant rows in the G1 database; the mocks here only echo what the test returns
  it.skip('role grants read from the G1 database (get_my_permitted_roles on real rows)', () => {
    // G1: a member granted community+staff sees exactly those roles offered; a member with no grants sees community only.
  });

  // needs G1 (isolated test backend): persistence needs a real set_role_preference write and a real app restart with the stored session
  it.skip('a role switch is persisted and read back after a restart', () => {
    // G1: switch to professional, kill and relaunch the app, get_role_preference returns professional and the shell opens in that mode.
  });

  // needs G1 (isolated test backend): the hand-off opens the system browser on the configured web host, which exists only in the G1 environment
  it.skip("a staff/admin member's web-console hand-off reaches a real host", () => {
    // G1: switching to admin/staff opens webBaseUrl + /admin for a real staff member and the console loads.
  });
});
