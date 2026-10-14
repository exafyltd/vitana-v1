/**
 * VTID-05183 — roles: the role ladder and switch rules, the per-role drawer
 * navigation and the permission helpers. Extracted declarations are generated
 * from the web source (packages/core/extract.json); never edit them here.
 */
export * from './extracted/roles.generated';
export * from './extracted/role-navigation.generated';
export { getPermissions, canSwitchRole, canSwitchTenant } from './permissions';
export type { Permission } from './permissions';
