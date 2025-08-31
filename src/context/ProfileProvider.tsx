import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { UserRole } from "@/hooks/useRole";
import { TenantType } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

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

// Default profile for non-authenticated users
const getDefaultProfile = (): ProfileData => ({
  displayName: "Guest User",
  role: "community",
  tenantId: "maxina",
  initials: "GU",
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [profile, setProfile] = useState<ProfileData>(getDefaultProfile());
  const [loading, setLoading] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      // Fetch profile data from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      // Create initials from full name or email
      const displayName = profileData?.full_name || user?.email?.split('@')[0] || "User";
      const initials = displayName.split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || "U";

      setProfile({
        displayName,
        role: "community", // Default role, will be updated by role system
        tenantId: "maxina", // Default tenant, will be updated by tenant system
        initials,
      });
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && session) {
      fetchUserProfile(user.id);
    } else {
      // Use default profile for non-authenticated users
      setProfile(getDefaultProfile());
      setLoading(false);
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