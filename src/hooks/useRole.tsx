import { createContext, useContext, useState, useEffect } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/localStorage";
import { useTenant } from "./useTenant";

export type UserRole = "community" | "patient" | "professional" | "staff" | "admin";

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
  hasPermission: (requiredRole: UserRole) => boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  community: 1,
  patient: 2, 
  professional: 3,
  staff: 4,
  admin: 5,
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const [currentRole, setCurrentRole] = useState<UserRole>("community");

  // Load role from storage on mount
  useEffect(() => {
    const savedRole = getLocalStorageItem(tenant.id, "auth", "role", "community") as UserRole;
    setCurrentRole(savedRole);
  }, [tenant.id]);

  const hasPermission = (requiredRole: UserRole): boolean => {
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  const setRole = (role: UserRole) => {
    setCurrentRole(role);
    setLocalStorageItem(tenant.id, "auth", "role", role);
    
    // Emit role change event
    window.dispatchEvent(new CustomEvent("role.changed", {
      detail: { from: currentRole, to: role }
    }));
  };

  const value: RoleContextValue = {
    role: currentRole,
    setRole,
    hasPermission,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}