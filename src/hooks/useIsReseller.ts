import { useTenant } from "./useTenant";
import { useRole, UserRole } from "./useRole";

export function useIsReseller() {
  const { tenant } = useTenant();
  const { currentRole } = useRole();

  // Reseller feature is only available in Maxina tenant
  const isMaxinaTenant = tenant?.slug === "maxina";
  const isResellerRole = currentRole === ("reseller" as UserRole);

  return {
    isReseller: isMaxinaTenant && isResellerRole,
    isMaxinaTenant,
    isResellerRole,
  };
}
