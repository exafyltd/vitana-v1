import type { UserRole } from "@/hooks/useRole";
import { getCommandHubUrl } from "@/config/devHub.config";

/**
 * Where ProfileDrawer.handleRoleChange goes after a successful role switch.
 * Pulled out so the mapping can be unit tested without rendering the whole
 * drawer. Everything but developer/infra is an in-app route, reached with
 * react-router's navigate() (VTID-03916); developer/infra resolve to an
 * absolute, cross-origin URL (the gateway's Command Hub) that navigate()
 * cannot reach — isExternalRoleSwitchDestination() below tells the caller
 * which navigation primitive to use.
 */
export function getRoleSwitchDestination(role: UserRole): string {
  switch (role) {
    case "admin":
    case "staff":
      return "/admin";
    case "backoffice":
      // VTID-03832: BackOffice home (route shell lands in the /backoffice skeleton VTID)
      return "/backoffice/dashboard";
    case "professional":
      return "/professional/dashboard";
    case "patient":
      return "/patient/dashboard";
    case "developer":
    case "infra": {
      // Technical, cross-tenant roles with no in-app landing screen of their
      // own — they land on the gateway's Command Hub, not community. Falls
      // back to /home only if the gateway base isn't configured at all.
      const commandHubUrl = getCommandHubUrl();
      return commandHubUrl || "/home";
    }
    case "community":
    default:
      return "/home";
  }
}

export function isExternalRoleSwitchDestination(destination: string): boolean {
  return /^https?:\/\//.test(destination);
}
