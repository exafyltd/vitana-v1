/**
 * VTID-04675 / VTID-04676: a notification category appears on the member
 * Settings › Notifications screen only when it is active and holds at least
 * one type the admin has switched on. The gateway applies the same rule to
 * the member list (routes/user-category-preferences.ts); the admin preview
 * uses this copy so it shows exactly what members get.
 */
export interface CategoryLike {
  is_active: boolean;
  mapped_types: string[] | null;
}

export function visibleToMembers(cat: CategoryLike, enabledTypes: Set<string>): boolean {
  return cat.is_active && (cat.mapped_types || []).some((type) => enabledTypes.has(type));
}
