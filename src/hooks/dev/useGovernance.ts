import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, GovernanceStatus } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseGovernanceOptions {
  enabled?: boolean;
}

export function useGovernance(options: UseGovernanceOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['governance-status'],
    queryFn: async () => {
      const result = await gatewayClient.getGovernanceStatus();
      if (isGatewayError(result)) {
        return { governance: null as GovernanceStatus | null, error: result, available: false };
      }
      return { governance: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.governanceRefreshInterval,
    enabled,
  });

  return {
    governance: query.data?.governance || null,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
