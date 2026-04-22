import { useVitanaIndexCache } from "./VitanaIndexProvider";

/**
 * Renders just the numeric Vitana Index value (or "…" while loading).
 * Reads from the singleton VitanaIndexProvider context — no new useQuery
 * subscription per mount point.
 */
export function VitanaIndexValue() {
  const { index, isLoading } = useVitanaIndexCache();
  if (isLoading || !index) return <>…</>;
  return <>{index.total}</>;
}

export default VitanaIndexValue;
