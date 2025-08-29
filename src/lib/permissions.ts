export type Permission =
  | "exafy.admin"
  | "tenant.switch"
  | "role.switch.self";

export function getPermissions(session: any): Set<Permission> {
  // TODO: Derive permissions from session claims or backend payload
  // For now, return demo permissions based on user metadata
  const permissions = new Set<Permission>();
  
  // Demo logic - replace with real permission system
  if (session?.user?.email?.includes("admin")) {
    permissions.add("exafy.admin");
    permissions.add("tenant.switch");
    permissions.add("role.switch.self");
  } else {
    // All authenticated users can switch their own role for demo
    permissions.add("role.switch.self");
  }
  
  return permissions;
}

export function canSwitchTenant(permissions: Set<Permission>): boolean {
  return permissions.has("exafy.admin") && permissions.has("tenant.switch");
}

export function canSwitchRole(permissions: Set<Permission>): boolean {
  return permissions.has("role.switch.self");
}