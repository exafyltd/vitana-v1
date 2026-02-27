import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, LLMTelemetry, LLMRoutingPolicy } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseLLMMetricsOptions {
  enabled?: boolean;
}

export function useLLMMetrics(options: UseLLMMetricsOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['llm-metrics'],
    queryFn: async () => {
      const [telemetryResult, policyResult] = await Promise.all([
        gatewayClient.getLLMTelemetry(),
        gatewayClient.getLLMRoutingPolicy(),
      ]);

      const telemetry = isGatewayError(telemetryResult) ? null : telemetryResult;
      const policy = isGatewayError(policyResult) ? null : policyResult;
      const allFailed = isGatewayError(telemetryResult) && isGatewayError(policyResult);

      return {
        telemetry,
        policy,
        error: allFailed ? telemetryResult : null,
        available: !allFailed,
      };
    },
    refetchInterval: DEV_HUB_CONFIG.llmRefreshInterval,
    enabled,
  });

  return {
    telemetry: query.data?.telemetry as LLMTelemetry | null ?? null,
    policy: query.data?.policy as LLMRoutingPolicy | null ?? null,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
