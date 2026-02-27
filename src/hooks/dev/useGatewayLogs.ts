import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, GatewayEvent } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseGatewayLogsOptions {
  limit?: number;
  method?: string;
  path?: string;
  status_code?: number;
  enabled?: boolean;
}

export function useGatewayLogs(options: UseGatewayLogsOptions = {}) {
  const {
    limit = DEV_HUB_CONFIG.maxGatewayLogs,
    method,
    path,
    status_code,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: ['gateway-logs', limit, method, path, status_code],
    queryFn: async () => {
      const result = await gatewayClient.getGatewayEvents({ limit, method, path, status_code });
      if (isGatewayError(result)) {
        return { events: [] as GatewayEvent[], error: result, available: false };
      }
      return { events: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.gatewayLogsRefreshInterval,
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
