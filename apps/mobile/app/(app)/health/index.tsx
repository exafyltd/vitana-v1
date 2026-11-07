/**
 * VTID-05455 (native-wave2-health-biology-r3/health-hub) — `/health`
 * (HEALTH.OVERVIEW), `/health?mode=medical` (HEALTH.MEDICAL) and
 * `/health?mode=supplements` (HEALTH.SUPPLEMENTS): one route, the `mode`
 * search param picks the mode; HealthScreen reads it and mounts the Vitana
 * Index overlay (OVERLAY.VITANA_INDEX).
 */
import { HealthScreen } from '../../../src/screens/health/HealthScreen';

export default function HealthRoute() {
  return <HealthScreen />;
}
