import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, RecentVTID } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseDevVTIDOptions {
  limit?: number;
  enabled?: boolean;
}

export function useDevVTID(options: UseDevVTIDOptions = {}) {
  const {
    limit = DEV_HUB_CONFIG.maxRecentVTIDs,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: ['dev-vtid', limit],
    queryFn: async () => {
      const result = await gatewayClient.getRecentVTIDs({ limit });
      
      if (isGatewayError(result)) {
        return {
          vtids: [] as RecentVTID[],
          error: result,
          available: false,
        };
      }
      
      return {
        vtids: result,
        error: null,
        available: true,
      };
    },
    refetchInterval: DEV_HUB_CONFIG.vtidRefreshInterval,
    enabled,
  });

  return {
    vtids: query.data?.vtids || [],
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
