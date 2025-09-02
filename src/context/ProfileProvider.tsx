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
  handle?: string;
  bio?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  coverUrl?: string;
}

interface ProfileContextValue {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  refreshProfile: () => void;
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

      // Create display name and initials
      const displayName = profileData?.display_name || profileData?.full_name || user?.email?.split('@')[0] || "User";
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
        avatar: profileData?.avatar_url,
        handle: profileData?.handle,
        bio: profileData?.bio,
        fullName: profileData?.full_name,
        email: profileData?.email || user?.email,
        phone: profileData?.phone,
        coverUrl: profileData?.cover_url,
      });
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh profile data
  const refreshProfile = () => {
    if (user && session) {
      fetchUserProfile(user.id);
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

  // Listen for role changes and update profile
  useEffect(() => {
    const handleRoleChange = (event: CustomEvent) => {
      const { to: newRole } = event.detail;
      setProfile(prev => ({ ...prev, role: newRole }));
    };

    window.addEventListener('role.changed', handleRoleChange as EventListener);
    return () => {
      window.removeEventListener('role.changed', handleRoleChange as EventListener);
    };
  }, []);

  const updateProfile = (data: Partial<ProfileData>) => {
    setProfile(prev => ({ ...prev, ...data }));
  };

  const value: ProfileContextValue = {
    profile,
    updateProfile,
    refreshProfile,
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