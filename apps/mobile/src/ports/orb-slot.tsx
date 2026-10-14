/**
 * VTID-05186 (N3, Interfaces I-N6) — the ORB slot in the centre of the bottom
 * bar. N6 owns the ORB FAB and registers it here; until then a placeholder of
 * the same footprint keeps the five-column layout (hidden from accessibility).
 * `bottomNavVisible` is the native form of the web's
 * `body[data-bottom-nav-visible]`; `hiddenBySheet` is true while the role
 * switcher is open (business-modes.test.ts "open sheet hides the ORB button").
 */
import type { ComponentType } from 'react';
import { View } from 'react-native';

export type OrbSlotProps = { bottomNavVisible: boolean; hiddenBySheet: boolean };

let Registered: ComponentType<OrbSlotProps> | null = null;

export function registerOrbSlot(Component: ComponentType<OrbSlotProps> | null): void {
  Registered = Component;
}

export const ORB_SLOT_SIZE = 56;

export function OrbSlot(props: OrbSlotProps) {
  if (Registered) return <Registered {...props} />;
  return <View testID="orb-slot-placeholder" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: ORB_SLOT_SIZE, height: ORB_SLOT_SIZE }} />;
}
