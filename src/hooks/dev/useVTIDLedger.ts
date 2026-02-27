import { useQuery } from "@tanstack/react-query";
import { gatewayClient, isGatewayError, VTIDRecord, VTIDProjection, AllocatorStatus } from "@/lib/devGatewayClient";
import { DEV_HUB_CONFIG } from "@/config/devHub.config";

interface UseVTIDLedgerOptions {
  limit?: number;
  status?: string;
  spec_status?: string;
  search?: string;
  enabled?: boolean;
}

export function useVTIDLedger(options: UseVTIDLedgerOptions = {}) {
  const {
    limit = DEV_HUB_CONFIG.maxRecentVTIDs,
    status: statusFilter,
    spec_status,
    search,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: ['vtid-ledger', limit, statusFilter, spec_status, search],
    queryFn: async () => {
      const result = await gatewayClient.getVTIDList({ limit, status: statusFilter, spec_status, search });
      if (isGatewayError(result)) {
        return { vtids: [] as VTIDRecord[], error: result, available: false };
      }
      return { vtids: result, error: null, available: true };
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

export function useVTIDDetail(vtid: string | null) {
  const query = useQuery({
    queryKey: ['vtid-detail', vtid],
    queryFn: async () => {
      if (!vtid) return null;
      const result = await gatewayClient.getVTIDDetail(vtid);
      if (isGatewayError(result)) return null;
      return result;
    },
    enabled: !!vtid,
  });

  return {
    vtid: query.data || null,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useVTIDProjection(enabled = true) {
  const query = useQuery({
    queryKey: ['vtid-projection'],
    queryFn: async () => {
      const result = await gatewayClient.getVTIDProjection();
      if (isGatewayError(result)) {
        return { projection: null as VTIDProjection | null, error: result, available: false };
      }
      return { projection: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.vtidRefreshInterval,
    enabled,
  });

  return {
    projection: query.data?.projection || null,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useAllocatorStatus(enabled = true) {
  const query = useQuery({
    queryKey: ['vtid-allocator-status'],
    queryFn: async () => {
      const result = await gatewayClient.getAllocatorStatus();
      if (isGatewayError(result)) {
        return { allocator: null as AllocatorStatus | null, error: result, available: false };
      }
      return { allocator: result, error: null, available: true };
    },
    refetchInterval: DEV_HUB_CONFIG.vtidRefreshInterval,
    enabled,
  });

  return {
    allocator: query.data?.allocator || null,
    error: query.data?.error || null,
    available: query.data?.available ?? false,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
