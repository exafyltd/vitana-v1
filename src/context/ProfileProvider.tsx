import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { UserRole } from "@/hooks/useRole";
import { TenantType } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";

interface ProfileData {
  avatar?: string;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
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
  location?: string;
  longevityArchetype?: string;
  links?: Array<{ label: string; url: string }>;
  languages?: string[];
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  x_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
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
      console.log('Fetching profile for user ID:', userId);
      
      // Fetch profile data from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        // Continue with default values even if there's an error
      }

      console.log('Profile data from DB:', profileData);

      // Create display name and initials with better fallback handling
      const displayName = profileData?.display_name || 
                         profileData?.full_name || 
                         user?.email?.split('@')[0] || 
                         "User";
      
      const initials = displayName
        .split(' ')
        .map(name => name?.[0]?.toUpperCase())
        .filter(Boolean)
        .join('')
        .slice(0, 2) || "U";

      const profileState = {
        displayName,
        role: "community" as const,
        tenantId: "maxina" as const,
        initials,
        avatar: profileData?.avatar_url || undefined,
        avatarOffsetX: profileData?.avatar_offset_x ?? 50,
        avatarOffsetY: profileData?.avatar_offset_y ?? 50,
        handle: profileData?.handle || undefined,
        bio: profileData?.bio || undefined,
        fullName: profileData?.full_name || undefined,
        email: profileData?.email || user?.email || undefined,
        phone: profileData?.phone || undefined,
        coverUrl: profileData?.cover_url || undefined,
        location: profileData?.location || undefined,
        links: profileData?.links ? (profileData.links as any) : undefined,
        languages: profileData?.languages ? (profileData.languages as any) : undefined,
        linkedin_url: profileData?.linkedin_url || undefined,
        instagram_url: profileData?.instagram_url || undefined,
        facebook_url: profileData?.facebook_url || undefined,
        x_url: profileData?.x_url || undefined,
        youtube_url: profileData?.youtube_url || undefined,
        tiktok_url: profileData?.tiktok_url || undefined,
        longevityArchetype: profileData?.longevity_archetype || undefined,
      };

      console.log('Setting profile state:', profileState);
      setProfile(profileState);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      // Set default profile even on error
      setProfile({
        displayName: user?.email?.split('@')[0] || "User",
        role: "community",
        tenantId: "maxina",
        initials: user?.email?.charAt(0)?.toUpperCase() || "U",
        email: user?.email,
      });
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
      
      // Set up real-time subscription for profile changes
      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated in real-time:', payload);
            fetchUserProfile(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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