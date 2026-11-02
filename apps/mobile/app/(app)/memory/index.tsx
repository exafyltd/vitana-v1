/**
 * VTID-05427 (native-wave2-memory-diary-r2/memory) — `/memory`
 * (MEMORY.OVERVIEW). The `tab` search param picks Categories (default),
 * Timeline or Education, like the web `useUrlTab("tab")`; MemoryOverview reads it.
 */
import { MemoryOverview } from '../../../src/screens/memory/MemoryOverview';

export default function MemoryOverviewRoute() {
  return <MemoryOverview />;
}
