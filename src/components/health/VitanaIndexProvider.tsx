import { createContext, useContext, ReactNode } from "react";
import { useVitanaIndex, type VitanaIndexState } from "@/hooks/useVitanaIndex";

interface VitanaIndexContextShape {
  index: VitanaIndexState | null;
  isLoading: boolean;
}

const VitanaIndexContext = createContext<VitanaIndexContextShape | null>(null);

/**
 * Single source of truth for the Vitana Index across the app.
 * Mounted once at the App root — opens ONE useQuery subscription and exposes
 * the state to any descendant via useVitanaIndexCache(). This avoids fanning
 * out N useQuery subscriptions across pages, which proved fragile on the
 * Appilix Android WebView after the 2026-04-22 follow-up PR.
 */
export function VitanaIndexProvider({ children }: { children: ReactNode }) {
  const { index, isLoading } = useVitanaIndex();
  return (
    <VitanaIndexContext.Provider value={{ index, isLoading }}>
      {children}
    </VitanaIndexContext.Provider>
  );
}

/**
 * Read the current Vitana Index state. Returns a safe default when used
 * outside the provider tree (so storybook / tests / lazy-loaded fragments
 * rendered before provider mount don't crash).
 */
export function useVitanaIndexCache(): VitanaIndexContextShape {
  const ctx = useContext(VitanaIndexContext);
  return ctx ?? { index: null, isLoading: true };
}
