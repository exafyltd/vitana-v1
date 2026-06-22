import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthProvider';
import { useTenantSafe } from '@/hooks/useTenant';
import { runPostLoginWarmup } from '@/lib/postLoginWarmup';

/**
 * Fires the post-login warmup orchestrator once auth has settled with a user.
 * Mounted high in the tree (inside <BrowserRouter>, before AppLayout) so the
 * warmup starts at the earliest possible point of the first authenticated load.
 * The orchestrator itself is idempotent per-user and defers around the Appilix
 * identity reload, so calling it from an effect on every render is safe.
 */
export function usePostLoginWarmup(): void {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const tenantCtx = useTenantSafe();
  const tenantId = tenantCtx?.activeTenantId ?? null;

  useEffect(() => {
    if (loading || !user?.id) return;
    runPostLoginWarmup({ queryClient, userId: user.id, tenantId });
  }, [loading, user?.id, tenantId, queryClient]);
}
