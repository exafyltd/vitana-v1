/**
 * VTID-05527 (Native Wave 2, role-modes staff lane) — `/staff/dashboard`
 * (src/App.tsx, `ProtectedRoute requiredRole="staff"` around
 * src/pages/staff/Dashboard.tsx). Staff mode has no bottom tabs (design §2a).
 */
import { StaffDashboardScreen } from '../../../src/screens/staff/DashboardScreen';

export default function StaffDashboardRoute() {
  return <StaffDashboardScreen />;
}
