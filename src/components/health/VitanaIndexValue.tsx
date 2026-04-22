import { useVitanaIndex } from "@/hooks/useVitanaIndex";

/**
 * Renders just the numeric Vitana Index value (or "…" while loading).
 * Drop-in replacement for inline hardcoded "742" snippets across the app.
 */
export function VitanaIndexValue() {
  const { index, isLoading } = useVitanaIndex();
  if (isLoading || !index) return <>…</>;
  return <>{index.total}</>;
}

export default VitanaIndexValue;
