/**
 * VTID-05526 (Native Wave 2, role-modes professional lane) — `/professional/dashboard`
 * (src/App.tsx, `ProtectedRoute requiredRole="professional"` around
 * src/pages/professional/Dashboard.tsx).
 */
import { ProfessionalDashboardScreen } from '../../../src/screens/professional/DashboardScreen';

export default function ProfessionalDashboardRoute() {
  return <ProfessionalDashboardScreen />;
}
