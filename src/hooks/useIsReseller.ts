import { useResellerProfile } from "./useResellerProfile";

/**
 * Hook to check if current user is a reseller.
 * Reseller capability is now based on having an active reseller_profiles entry,
 * NOT based on tenant role.
 */
export function useIsReseller() {
  const { data: profile, isLoading } = useResellerProfile();

  // User is a reseller if they have an active reseller profile
  const isReseller = !!profile && profile.status === "active";

  return {
    isReseller,
    isLoading,
    resellerProfile: profile,
  };
}
