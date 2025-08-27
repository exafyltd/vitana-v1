import { createContext, useContext, useState } from "react";

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
  // Default to Community for Mariia Maxina persona
  const [currentRole, setCurrentRole] = useState<UserRole>("community");

  const hasPermission = (requiredRole: UserRole): boolean => {
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  const value: RoleContextValue = {
    role: currentRole,
    setRole: setCurrentRole,
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