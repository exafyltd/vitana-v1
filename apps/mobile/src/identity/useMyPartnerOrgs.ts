/**
 * VTID-05186 (N3, plan change 11) — src/hooks/useOrgMembers.ts useMyPartnerOrgs:
 * `GET /api/v1/partner-orgs/mine` through the gateway port.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { gatewayGet } from '../auth/gateway';

export interface MyOrgRow {
  id: string;
  org_key?: string;
  display_name: string;
  org_type?: string;
  status?: string;
  role: string;
}

export function useMyPartnerOrgs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['partner-orgs-mine'],
    queryFn: async () => {
      const json = await gatewayGet<{ organizations?: MyOrgRow[] }>('/api/v1/partner-orgs/mine');
      return json.organizations ?? [];
    },
    enabled: !!user,
  });
}
