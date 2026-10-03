/**
 * Dev/automation service accounts — never shown in any community member's
 * chat inbox. These accounts exist purely for internal engineering/autopilot
 * work (e.g. the OASIS worker/executor plane, VTID-03516) and are not
 * community members. A 2026-09-16 bootstrap step had two of them each send
 * a "Hello! My name is ..." intro DM to every community member, landing a
 * dev-only thread in 222+ real users' inboxes (VTID-03982).
 *
 * Keyed by user_id (not email — chat threads never carry email) so new
 * accounts must be added here explicitly rather than matched by pattern.
 */
const DEV_SERVICE_ACCOUNT_IDS = new Set<string>([
  "887b34cb-9ee9-47dc-ad53-db5be1869846", // claude-code-agent@exafy.io
  "856c30ed-7136-4bc5-8bfe-86a1e8ea1401", // operator-autopilot@exafy.io
]);

/** Check whether a user ID belongs to an internal dev/automation account. */
export function isDevServiceAccount(userId: string | null | undefined): boolean {
  return !!userId && DEV_SERVICE_ACCOUNT_IDS.has(userId);
}
