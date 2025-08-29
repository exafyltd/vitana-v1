import { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";

interface AdminGuardProps {
  children: ReactElement;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { hasPermission } = useRole();

  if (!hasPermission("staff")) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}