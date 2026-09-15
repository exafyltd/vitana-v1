import { ReactElement } from "react";
import { useRole, UserRole } from "@/hooks/useRole";
import NotAuthorized from "@/pages/NotAuthorized";
import { DelayedLoader } from "@/components/ui/DelayedLoader";

interface ProtectedRouteProps {
  children: ReactElement;
  requiredRole: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { hasPermission, isLoading } = useRole();

  // VTID-03909: on a fresh page load (e.g. the hard reload the role switcher
  // does after confirming a switch) the role preference query starts out
  // loading, and hasPermission() falls back to the "community" default while
  // it does — which used to render "Access Denied" for a flash on every
  // role-gated route before the real role arrived and this re-rendered.
  if (isLoading) {
    return <DelayedLoader fullscreen />;
  }

  if (!hasPermission(requiredRole)) {
    return <NotAuthorized />;
  }

  return children;
}