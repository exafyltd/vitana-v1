/**
 * News-feed mode — single switch point (VTID-03319).
 *
 * LAUNCH PHASE (now): `'global'`. The community is small and few members post,
 * so the News feed shows EVERY public post from EVERYONE — including the
 * viewer's own — and updates live. This is deliberate: with little activity a
 * follow-only feed would look empty, so we surface all activity to make the
 * community feel alive.
 *
 * GROWTH PHASE (later): flip to `'following'`. Once there is enough organic
 * activity, the feed should show posts only from people the viewer follows.
 * To switch, set `VITE_FEED_MODE=following` (build-time) — no code change
 * needed — or change the default below.
 */
export type FeedMode = "global" | "following";

export const FEED_MODE: FeedMode =
  (import.meta.env.VITE_FEED_MODE as FeedMode) === "following"
    ? "following"
    : "global";

/**
 * In global (launch) mode the viewer also sees their own posts in the feed —
 * maximises perceived activity and gives the author instant confirmation that
 * their post went live. In following mode we revert to the conventional
 * "don't show me my own posts" behaviour.
 */
export const FEED_INCLUDE_OWN_POSTS = FEED_MODE === "global";

/** True when the feed should be restricted to followed authors. */
export const FEED_FOLLOWING_ONLY = FEED_MODE === "following";
