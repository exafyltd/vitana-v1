import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * User-driven news feed preferences — saved articles, hidden articles,
 * muted sources, and "show less like this" downrank counters.
 * Persisted to localStorage via zustand/persist.
 */
export interface NewsFeedPreferences {
  savedArticleIds: string[];
  hiddenArticleIds: string[];
  mutedSources: string[];
  downrankedTags: Record<string, number>;

  toggleSaved: (id: string) => void;
  hideArticle: (id: string) => void;
  unhideArticle: (id: string) => void;
  muteSource: (name: string) => void;
  unmuteSource: (name: string) => void;
  showLessLike: (tags: string[]) => void;

  isSaved: (id: string) => boolean;
  isHidden: (id: string) => boolean;
  isSourceMuted: (name: string) => boolean;
}

export const useNewsFeedPreferencesStore = create<NewsFeedPreferences>()(
  persist(
    (set, get) => ({
      savedArticleIds: [],
      hiddenArticleIds: [],
      mutedSources: [],
      downrankedTags: {},

      toggleSaved: (id) =>
        set((s) => ({
          savedArticleIds: s.savedArticleIds.includes(id)
            ? s.savedArticleIds.filter((x) => x !== id)
            : [...s.savedArticleIds, id],
        })),

      hideArticle: (id) =>
        set((s) =>
          s.hiddenArticleIds.includes(id)
            ? s
            : { hiddenArticleIds: [...s.hiddenArticleIds, id] }
        ),

      unhideArticle: (id) =>
        set((s) => ({
          hiddenArticleIds: s.hiddenArticleIds.filter((x) => x !== id),
        })),

      muteSource: (name) =>
        set((s) =>
          !name || s.mutedSources.includes(name)
            ? s
            : { mutedSources: [...s.mutedSources, name] }
        ),

      unmuteSource: (name) =>
        set((s) => ({
          mutedSources: s.mutedSources.filter((x) => x !== name),
        })),

      showLessLike: (tags) =>
        set((s) => {
          const next = { ...s.downrankedTags };
          for (const t of tags) next[t] = (next[t] || 0) + 1;
          return { downrankedTags: next };
        }),

      isSaved: (id) => get().savedArticleIds.includes(id),
      isHidden: (id) => get().hiddenArticleIds.includes(id),
      isSourceMuted: (name) => !!name && get().mutedSources.includes(name),
    }),
    { name: "news-feed-preferences" }
  )
);
