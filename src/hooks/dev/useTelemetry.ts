import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, TelemetrySnapshot } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseTelemetryOptions {
  enabled?: boolean;
}

export function useTelemetry(options: UseTelemetryOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['telemetry-snapshot'],
    queryFn: async () => {
      const result = await gatewayClient.getTelemetrySnapshot();
      if (isGatewayError(result)) {
        return { snapshot: null as TelemetrySnapshot | null, error: result, available: false };
      }
      return { snapshot: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.telemetryRefreshInterval,
    enabled,
  });

  return {
    snapshot: query.data?.snapshot || null,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
