import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, OasisEvent } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseOasisEventsOptions {
  limit?: number;
  service?: string;
  status?: string;
  vtid?: string;
  type?: string;
  smart?: boolean;
  enabled?: boolean;
}

export function useOasisEvents(options: UseOasisEventsOptions = {}) {
  const {
    limit = DEV_HUB_CONFIG.maxOasisEvents,
    service,
    status,
    vtid,
    type,
    smart = false,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: ['oasis-events', smart, limit, service, status, vtid, type],
    queryFn: async () => {
      const result = smart
        ? await gatewayClient.getOasisSmartEvents({ limit })
        : await gatewayClient.getOasisEvents({ limit, service, status, vtid, type });

      if (isGatewayError(result)) {
        return { events: [] as OasisEvent[], error: result, available: false };
      }
      return { events: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.oasisRefreshInterval,
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
