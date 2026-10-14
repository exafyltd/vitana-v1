/**
 * VTID-05182 — the native ORB UI (N6d). `registerOrbUi()` puts the FAB into
 * N3's bottom-bar ORB slot; app/_layout.tsx calls it once and mounts
 * `<OrbProvider>` + `<OrbOverlay/>` inside the shell root.
 */
import { registerOrbSlot } from '../../ports/orb-slot';
import { OrbFab } from './OrbFab';

export { OrbFab } from './OrbFab';
export { OrbOverlay } from './OrbOverlay';
export { OrbProvider, useOrbSession } from './OrbProvider';

export function registerOrbUi(): void {
  registerOrbSlot(OrbFab);
}
