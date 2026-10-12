/**
 * VTID-05096 — the member's phone verification status. Undefined while
 * loading, on error, or when the gateway switch is off, so every entry point
 * simply stays hidden in those cases.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { fetchPhoneStatus, phoneStatusQueryKey, type PhoneStatus } from "@/lib/phone-verification-client";

export function usePhoneVerificationStatus(): { status: PhoneStatus | undefined; available: boolean } {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: phoneStatusQueryKey(user?.id),
    enabled: !!user?.id,
    retry: false,
    staleTime: 60_000,
    queryFn: fetchPhoneStatus,
  });
  const available = !!data?.enabled;
  return { status: available ? data : undefined, available };
}
