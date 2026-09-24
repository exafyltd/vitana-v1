import { useCallback, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTenantSafe } from "@/hooks/useTenant";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * VTID-04500 (Community Autopilot CA-2): the role the Autopilot lineup is
 * requested for. Reads — never fetches — the role preference `useRole` caches
 * under ["rolePref", tenantId], so it needs no TenantProvider and cannot
 * interfere with useRole's own query. Mobile is always community, exactly like
 * `useRole().currentRole`.
 *
 * This is only a hint: the gateway decides the lineup server-side and narrows
 * any role the member is not permitted to use.
 */
export function useAutopilotRole(): string {
  const queryClient = useQueryClient();
  const tenantId = useTenantSafe()?.activeTenantId ?? null;
  const isMobile = useIsMobile();

  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(onChange),
    [queryClient],
  );
  const read = useCallback(() => {
    const v = queryClient.getQueryData<string | null>(["rolePref", tenantId]);
    return typeof v === "string" ? v : null;
  }, [queryClient, tenantId]);
  const cached = useSyncExternalStore(subscribe, read, read);

  if (isMobile) return "community";
  return (cached && cached.trim()) || "community";
}
