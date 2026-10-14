/**
 * VTID-05186 (N3, plan change 11) — src/hooks/usePatientAccess.ts: "am I a
 * patient?" from the own-row `patient_profiles` read (VTID-03988).
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { getSupabase } from '../auth/client';

export function usePatientAccess() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['patient-access', user?.id ?? null],
    queryFn: async () => {
      const { data, error } = await getSupabase().from('patient_profiles').select('user_id').eq('user_id', user?.id).maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  return { isPatient: query.data === true, isLoading: query.isLoading };
}
