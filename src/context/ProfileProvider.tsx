import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { UserRole } from "@/hooks/useRole";
import { TenantType } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import {
  AccountInfo,
  AccountVisibility,
  AccountFieldKey,
  FieldVisibility,
  DEFAULT_ACCOUNT_VISIBILITY,
} from "@/types/profile";

interface ProfileData {
  avatar?: string;
  avatarOffsetX?: number;
  avatarOffsetY?: number;
  displayName: string;
  role: UserRole;
  tenantId: TenantType;
  initials: string;
  handle?: string;
  // VTID-01967: Canonical Vitana ID. Permanent once locked. Under the
  // replace policy, profiles.handle is a mirror of vitana_id, so existing
  // `handle` consumers keep working while new code reads vitanaId.
  vitanaId?: string;
  vitanaIdLocked?: boolean;
  // VTID-01987: User's chronological signup rank. Suffix of vitana_id is
  // always equal to this number. Useful for "Member #N" badges.
  registrationSeq?: number;
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
  account?: AccountInfo;
}

interface ProfileContextValue {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  refreshProfile: () => void;
  updateAccount: (data: Partial<AccountInfo>) => Promise<void>;
  setFieldVisibility: (field: AccountFieldKey, visibility: FieldVisibility) => Promise<void>;
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
      
      // Fetch profile data from Supabase. abortSignal bounds the request —
      // without it, a stalled connection (e.g. a WebView socket suspended by
      // backgrounding/foregrounding, common when switching tabs on mobile)
      // leaves this await pending forever, so `finally` never runs and
      // `loading` never clears: an infinite "Profil wird geladen…" spinner.
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
        .abortSignal(AbortSignal.timeout(10000));

      if (error) {
        console.error('Error fetching profile:', error);
        // Continue with default values even if there's an error
      }

      console.log('Profile data from DB:', profileData);

      // Display name derives from Account first/last name (single source of
      // truth, edited in the Account pill). Falls back to legacy display_name
      // / full_name / email for users who haven't filled in Account yet.
      const composedFullName = [
        (profileData as any)?.first_name,
        (profileData as any)?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      const displayName =
        composedFullName ||
        profileData?.display_name ||
        profileData?.full_name ||
        user?.email?.split('@')[0] ||
        "User";
      
      const initials = displayName
        .split(' ')
        .map(name => name?.[0]?.toUpperCase())
        .filter(Boolean)
        .join('')
        .slice(0, 2) || "U";

      const rawVisibility = (profileData as any)?.account_visibility as
        | Partial<AccountVisibility>
        | null
        | undefined;
      const visibility: AccountVisibility = {
        ...DEFAULT_ACCOUNT_VISIBILITY,
        ...(rawVisibility ?? {}),
      };

      const account: AccountInfo = {
        firstName: (profileData as any)?.first_name || undefined,
        lastName: (profileData as any)?.last_name || undefined,
        dateOfBirth: profileData?.date_of_birth || undefined,
        gender: (profileData as any)?.gender || undefined,
        maritalStatus: (profileData as any)?.marital_status || undefined,
        email: profileData?.email || user?.email || undefined,
        phone: profileData?.phone || undefined,
        address: (profileData as any)?.address || undefined,
        country: (profileData as any)?.country || undefined,
        city: (profileData as any)?.city || undefined,
        memberSince: profileData?.created_at || undefined,
        accountType: (profileData as any)?.account_type || "Community",
        tenantId: "maxina",
        role: "community",
        verificationStatus:
          ((profileData as any)?.verification_status as AccountInfo["verificationStatus"]) ??
          "unverified",
        // Public profile fields (moved from Identity drawer)
        handle: profileData?.handle || undefined,
        avatarUrl: profileData?.avatar_url || undefined,
        avatarOffsetX: profileData?.avatar_offset_x ?? 50,
        avatarOffsetY: profileData?.avatar_offset_y ?? 50,
        longevityArchetype: profileData?.longevity_archetype || undefined,
        visibility,
      };

      const profileState = {
        displayName,
        role: "community" as const,
        tenantId: "maxina" as const,
        initials,
        avatar: profileData?.avatar_url || undefined,
        avatarOffsetX: profileData?.avatar_offset_x ?? 50,
        avatarOffsetY: profileData?.avatar_offset_y ?? 50,
        handle: profileData?.handle || undefined,
        // VTID-01967 + VTID-01987: vitana_id, vitana_id_locked, and the v2
        // chronological registration_seq. Null-tolerant on all three: any
        // env that hasn't run the v2 backfill yet keeps working.
        vitanaId: (profileData as any)?.vitana_id || undefined,
        vitanaIdLocked: (profileData as any)?.vitana_id_locked === true,
        registrationSeq:
          typeof (profileData as any)?.registration_seq === 'number'
            ? (profileData as any).registration_seq
            : undefined,
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
        account,
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

  // Map AccountInfo fields -> profiles table columns.
  const accountFieldToColumn: Partial<Record<keyof AccountInfo, string>> = {
    firstName: 'first_name',
    lastName: 'last_name',
    dateOfBirth: 'date_of_birth',
    gender: 'gender',
    maritalStatus: 'marital_status',
    email: 'email',
    phone: 'phone',
    address: 'address',
    country: 'country',
    city: 'city',
    accountType: 'account_type',
    verificationStatus: 'verification_status',
    handle: 'handle',
    avatarUrl: 'avatar_url',
    avatarOffsetX: 'avatar_offset_x',
    avatarOffsetY: 'avatar_offset_y',
    longevityArchetype: 'longevity_archetype',
  };

  const updateAccount = async (data: Partial<AccountInfo>) => {
    if (!user) return;

    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const column = accountFieldToColumn[key as keyof AccountInfo];
      if (column) row[column] = value ?? null;
    }
    if (data.visibility) row.account_visibility = data.visibility;

    // If the patch touches first/last name, also write display_name so any
    // legacy consumer still reading that column stays in sync with the new
    // derived display-name shown on the Identity card.
    if ('firstName' in data || 'lastName' in data) {
      const existing = profile.account;
      const first = 'firstName' in data ? data.firstName : existing?.firstName;
      const last = 'lastName' in data ? data.lastName : existing?.lastName;
      const composed = [first, last].filter(Boolean).join(' ').trim();
      row.display_name = composed || null;
    }

    row.updated_at = new Date().toISOString();

    // Use UPDATE rather than UPSERT: the profiles row is created on signup
    // and always exists here. UPSERT would attempt an INSERT first, which
    // fails the profiles.vitana_id NOT NULL constraint because vitana_id is
    // not part of this patch payload.
    const { error } = await supabase
      .from('profiles' as any)
      .update(row as any)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update account:', error);
      throw error;
    }

    // Optimistic local update; realtime subscription will reconcile.
    setProfile(prev => ({
      ...prev,
      account: {
        ...(prev.account ?? { visibility: DEFAULT_ACCOUNT_VISIBILITY }),
        ...data,
        visibility: {
          ...(prev.account?.visibility ?? DEFAULT_ACCOUNT_VISIBILITY),
          ...(data.visibility ?? {}),
        },
      },
    }));
  };

  const setFieldVisibility = async (
    field: AccountFieldKey,
    visibility: FieldVisibility,
  ) => {
    const current = profile.account?.visibility ?? DEFAULT_ACCOUNT_VISIBILITY;
    await updateAccount({ visibility: { ...current, [field]: visibility } });
  };

  const value: ProfileContextValue = {
    profile,
    updateProfile,
    refreshProfile,
    updateAccount,
    setFieldVisibility,
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