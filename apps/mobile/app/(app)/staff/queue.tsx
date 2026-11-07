/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/queue`
 * (src/App.tsx, `ProtectedRoute requiredRole="staff"` around
 * src/pages/staff/Queue.tsx). Staff mode has no bottom tabs (design §2a).
 */
import { StaffQueueScreen } from '../../../src/screens/staff/QueueScreen';

export default function StaffQueueRoute() {
  return <StaffQueueScreen />;
}
