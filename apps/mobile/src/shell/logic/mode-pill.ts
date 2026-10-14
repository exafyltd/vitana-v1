/**
 * VTID-05186 (N3, plan change 3) — src/components/ui/MobileModePill.tsx
 * `ModeOption` and `findActiveLabel`, plus the auto-expanded active group.
 * Pinned in scripts/native/shell-pins.json.
 */
export interface ModeOption {
  value: string;
  label: string;
  icon?: string;
  badge?: number;
  children?: ModeOption[];
}

export function findActiveLabel(modes: ModeOption[], activeMode: string): { label: string; icon?: string } | null {
  for (const mode of modes) {
    if (mode.value === activeMode) return { label: mode.label, icon: mode.icon };
    if (mode.children) {
      const child = mode.children.find((c) => c.value === activeMode);
      if (child) return { label: child.label, icon: child.icon };
    }
  }
  return null;
}

export function initiallyExpandedGroups(modes: ModeOption[], activeMode: string): Set<string> {
  const set = new Set<string>();
  for (const mode of modes) if (mode.children?.some((c) => c.value === activeMode)) set.add(mode.value);
  return set;
}
