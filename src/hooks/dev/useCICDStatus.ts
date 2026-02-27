import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, CICDHealth, CICDApproval, LockStatus } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseCICDStatusOptions {
  enabled?: boolean;
}

export function useCICDStatus(options: UseCICDStatusOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['cicd-status'],
    queryFn: async () => {
      const [healthResult, approvalsResult, lockResult] = await Promise.all([
        gatewayClient.getCICDHealth(),
        gatewayClient.getCICDApprovals(),
        gatewayClient.getLockStatus(),
      ]);

      const health = isGatewayError(healthResult) ? null : healthResult;
      const approvals = isGatewayError(approvalsResult) ? [] as CICDApproval[] : approvalsResult;
      const lock = isGatewayError(lockResult) ? null : lockResult;
      const allFailed = isGatewayError(healthResult) && isGatewayError(approvalsResult) && isGatewayError(lockResult);

      return {
        health,
        approvals,
        lock,
        pendingApprovals: approvals.filter(a => a.status === 'pending').length,
        error: allFailed ? healthResult : null,
        available: !allFailed,
      };
    },
    refetchInterval: DEV_HUB_CONFIG.cicdRefreshInterval,
    enabled,
  });

  return {
    health: query.data?.health || null,
    approvals: query.data?.approvals || [],
    lock: query.data?.lock || null,
    pendingApprovals: query.data?.pendingApprovals ?? 0,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
