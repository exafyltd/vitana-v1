import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, WorkerInfo, PendingTask } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseWorkerStatusOptions {
  enabled?: boolean;
}

export function useWorkerStatus(options: UseWorkerStatusOptions = {}) {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['worker-status'],
    queryFn: async () => {
      const [workersResult, tasksResult] = await Promise.all([
        gatewayClient.getWorkers(),
        gatewayClient.getPendingTasks(),
      ]);

      const workers = isGatewayError(workersResult) ? [] as WorkerInfo[] : workersResult;
      const pendingTasks = isGatewayError(tasksResult) ? [] as PendingTask[] : tasksResult;
      const hasError = isGatewayError(workersResult) && isGatewayError(tasksResult);

      return {
        workers,
        pendingTasks,
        onlineCount: workers.filter(w => w.status === 'online').length,
        busyCount: workers.filter(w => w.status === 'busy').length,
        error: hasError ? workersResult : null,
        available: !hasError,
      };
    },
    refetchInterval: DEV_HUB_CONFIG.workersRefreshInterval,
    enabled,
  });

  return {
    workers: query.data?.workers || [],
    pendingTasks: query.data?.pendingTasks || [],
    onlineCount: query.data?.onlineCount ?? 0,
    busyCount: query.data?.busyCount ?? 0,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
