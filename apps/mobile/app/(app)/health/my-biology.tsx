/**
 * VTID-05457 (native-wave2-health-biology-r3/vitana-index-biology) —
 * `/health/my-biology` (HEALTH.MY_BIOLOGY), `?tab=omics` (HEALTH.BIOLOGY_OMICS)
 * and `?tab=supplements` (HEALTH.BIOLOGY_SUPPLEMENTS): one route, the `tab`
 * search param picks the tab (MyBiologyScreen reads it).
 */
import { MyBiologyScreen } from '../../../src/screens/health/MyBiologyScreen';

export default function MyBiologyRoute() {
  return <MyBiologyScreen />;
}
