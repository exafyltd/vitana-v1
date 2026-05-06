// Frontend hook that fetches resolved match images for a list of users.
//
// Frontend never decides priority — it just renders what the resolver returns.
// Generation happens server-side; the hook simply re-fetches if needed so that
// freshly-generated covers appear on the next render.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProfileImageSource =
  | "uploaded"
  | "imported"
  | "generated"
  | "initials";

export type MatchCoverSource =
  | "uploaded"
  | "generated"
  | "curated_library"
  | "initials";

export type MaxinaCategory = "dance" | "fitness" | "wellness";

export interface ResolvedMatchImage {
  userId: string;
  displayName: string | null;
  initials: string;
  fallbackSeed: string | null;
  profileImageUrl: string | null;
  profileImageSource: ProfileImageSource;
  matchCoverImageUrl: string | null;
  matchCoverSource: MatchCoverSource;
}

interface UseMaxinaMatchImagesOptions {
  matchedUserIds: string[];
  category?: MaxinaCategory;
  /** When true, the resolver waits for cover generation before responding. */
  awaitGeneration?: boolean;
}

interface UseMaxinaMatchImagesResult {
  byUserId: Record<string, ResolvedMatchImage>;
  loading: boolean;
  error: string | null;
}

export function useMaxinaMatchImages(
  options: UseMaxinaMatchImagesOptions,
): UseMaxinaMatchImagesResult {
  const { matchedUserIds, category, awaitGeneration } = options;
  const [state, setState] = useState<UseMaxinaMatchImagesResult>({
    byUserId: {},
    loading: matchedUserIds.length > 0,
    error: null,
  });

  // Stable key so the effect only re-runs when the *set* of ids changes.
  const idKey = useMemo(
    () => [...matchedUserIds].sort().join("|"),
    [matchedUserIds],
  );
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (matchedUserIds.length === 0) {
      setState({ byUserId: {}, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "resolve-match-images",
          {
            body: {
              matchedUserIds,
              category,
              awaitGeneration: !!awaitGeneration,
            },
          },
        );
        if (cancelled.current) return;
        if (error) throw error;
        const matches: ResolvedMatchImage[] = data?.matches ?? [];
        const byUserId: Record<string, ResolvedMatchImage> = {};
        for (const m of matches) byUserId[m.userId] = m;
        setState({ byUserId, loading: false, error: null });

        // If any match still has no cover, schedule a single re-fetch in 8s
        // to pick up images that were generated in the background. We only
        // re-fetch ONCE — repeated polling would defeat the cache.
        const stillMissing = matches.some((m) => !m.matchCoverImageUrl);
        if (stillMissing && !awaitGeneration) {
          setTimeout(() => {
            if (cancelled.current) return;
            void supabase.functions
              .invoke("resolve-match-images", {
                body: { matchedUserIds, category },
              })
              .then(({ data: refreshed }) => {
                if (cancelled.current || !refreshed?.matches) return;
                const next: Record<string, ResolvedMatchImage> = {};
                for (const m of refreshed.matches as ResolvedMatchImage[]) {
                  next[m.userId] = m;
                }
                setState({ byUserId: next, loading: false, error: null });
              });
          }, 8000);
        }
      } catch (err) {
        if (cancelled.current) return;
        setState({
          byUserId: {},
          loading: false,
          error: (err as Error).message ?? "Failed to resolve match images",
        });
      }
    })();

    return () => {
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, category, awaitGeneration]);

  return state;
}
