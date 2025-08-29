import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { UserRole } from "@/hooks/useRole";
import { TenantType } from "@/hooks/useTenant";

interface ProfileData {
  avatar?: string;
  displayName: string;
  role: UserRole;
  tenantId: TenantType;
  initials: string;
}

interface ProfileContextValue {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

// Default profile for demo - replace with real data from Supabase
const getDefaultProfile = (): ProfileData => ({
  displayName: "Mariia Maxina",
  role: "community",
  tenantId: "maxina",
  initials: "MM",
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(getDefaultProfile());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && session) {
      // TODO: Fetch real profile data from Supabase
      // For now, use email-based display name if available
      const emailName = user.email?.split('@')[0] || "User";
      const initials = emailName.split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      setProfile(prev => ({
        ...prev,
        displayName: user.user_metadata?.display_name || emailName,
        initials: initials || prev.initials,
      }));
    } else {
      // Use default profile for non-authenticated users
      setProfile(getDefaultProfile());
    }
  }, [user, session]);

  const updateProfile = (data: Partial<ProfileData>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const value: ProfileContextValue = {
    profile,
    updateProfile,
    loading,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}