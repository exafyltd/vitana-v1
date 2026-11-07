/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/schedule`
 * (src/App.tsx, `ProtectedRoute requiredRole="staff"` around the web's
 * `ComingSoonPlaceholder`). Staff mode has no bottom tabs (design §2a).
 */
import { StaffComingSoonScreen } from '../../../src/screens/staff/ComingSoonScreen';

export default function StaffScheduleRoute() {
  return <StaffComingSoonScreen route="schedule" />;
}
