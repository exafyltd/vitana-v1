

## Fix Unlike (Unheart) on Shorts

### Problem
Two issues prevent unliking from working:

1. The `handleLike` function in `MobileShortsFeed.tsx` only calls the database mutation when **liking** (`if (isLiking)`), so an unlike is never sent to the server.
2. The `useToggleLike` hook in `useShorts.ts` always **increments** `likes_count + 1` -- it has no logic to decrement.

The optimistic local count does go down (-1), but after the query refetches, the DB still has the old (higher) count, so the number jumps back up.

### Solution

**1. Update `useToggleLike` in `src/hooks/useShorts.ts`**

Accept a second parameter indicating the action ("like" or "unlike"). When unliking, decrement the count (with a floor of 0):

```
mutationFn: async ({ videoId, action }: { videoId: string; action: 'like' | 'unlike' }) => {
  // fetch current likes_count
  // if action === 'like', set likes_count + 1
  // if action === 'unlike', set Math.max(0, likes_count - 1)
}
```

**2. Update `handleLike` in `src/components/community/MobileShortsFeed.tsx`**

Call the mutation for **both** like and unlike, passing the appropriate action:

```
// Remove the `if (isLiking)` guard
toggleLike.mutate({ videoId, action: isLiking ? 'like' : 'unlike' });
```

### Files to Edit

- `src/hooks/useShorts.ts` -- change `useToggleLike` to accept and handle like/unlike
- `src/components/community/MobileShortsFeed.tsx` -- call mutation on both like and unlike

