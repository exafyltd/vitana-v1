import { ReactElement } from "react";
import { useRole, UserRole } from "@/hooks/useRole";
import NotAuthorized from "@/pages/NotAuthorized";

interface ProtectedRouteProps {
  children: ReactElement;
  requiredRole: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { hasPermission } = useRole();

  if (!hasPermission(requiredRole)) {
    return <NotAuthorized />;
  }

  return children;
}