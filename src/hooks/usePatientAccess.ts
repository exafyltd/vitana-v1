/**
 * VTID-03988 — "am I a patient?" read from the flag the database actually sets.
 *
 * `trg_activate_patient_profile` (vitana-platform migration 20260915120000)
 * inserts a `patient_profiles` row and bumps `memberships.role` on a user's
 * first health order. But `useRole().dbRole` reads `role_preferences` — the
 * ACTIVE role, written only by the desktop role switcher — so on mobile,
 * which has no switcher, a freshly activated patient still reads as
 * `community` and never finds their own results.
 *
 * This hook reads the activation row itself (own-row RLS policy
 * `patient_profiles_select`) so patient-facing surfaces can be unlocked
 * ADDITIVELY. It deliberately does not flip the active role:
 * `useRoleRouteEnforcement` bounces `dbRole === 'patient'` off every
 * community route to /patient/dashboard, so an auto-flip would lock a member
 * out of the whole community app after a single lab test.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

export function usePatientAccess() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['patient-access', user?.id ?? null],
    queryFn: async () => {
      // patient_profiles is not in the generated Supabase types yet — same
      // escape hatch useNotifications.ts uses for user_notification_preferences.
      const { data, error } = await (supabase as any)
        .from('patient_profiles')
        .select('user_id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  return { isPatient: query.data === true, isLoading: query.isLoading };
}
