export type Permission =
  | "exafy.admin"
  | "tenant.switch"
  | "role.switch.self";

export function getPermissions(session: any): Set<Permission> {
  const permissions = new Set<Permission>();
  
  // SECURITY FIX: Use proper metadata instead of email checking
  const isExafyAdmin = session?.user?.app_metadata?.exafy_admin === true;
  
  if (isExafyAdmin) {
    permissions.add("exafy.admin");
    permissions.add("tenant.switch");
    permissions.add("role.switch.self");
  } else {
    // All authenticated users can switch their own role
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