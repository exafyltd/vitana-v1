import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, RecentEvent } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseDevEventsOptions {
  tenant?: string;
  limit?: number;
  enabled?: boolean;
}

export function useDevEvents(options: UseDevEventsOptions = {}) {
  const {
    tenant = 'system',
    limit = DEV_HUB_CONFIG.maxRecentEvents,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: ['dev-events', tenant, limit],
    queryFn: async () => {
      const result = await gatewayClient.getRecentEvents({ tenant, limit });
      
      if (isGatewayError(result)) {
        return {
          events: [] as RecentEvent[],
          error: result,
          available: false,
        };
      }
      
      return {
        events: result,
        error: null,
        available: true,
      };
    },
    refetchInterval: DEV_HUB_CONFIG.eventsRefreshInterval,
    enabled,
  });

  return {
    events: query.data?.events || [],
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
