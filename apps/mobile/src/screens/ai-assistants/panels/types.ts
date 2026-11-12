/** VTID-05521 — the props every `/assistant` preferences panel takes (web `{ preferences, isUpdating, updatePreferences }`). */
import type { UserPreferences } from '../data/requests';

export type PanelProps = {
  preferences: UserPreferences;
  isUpdating: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
};
