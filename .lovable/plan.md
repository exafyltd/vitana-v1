

## Fix Double-Counting on Like

### Problem
The optimistic like adjustment (+1) is never cleared when fresh data arrives from the server. So the flow is:

1. Video starts at 0 likes
2. You tap heart -- local adjustment +1 -- displays 0+1 = **1** (correct momentarily)
3. DB mutation succeeds, query invalidates, `shorts` prop refreshes with likes=1
4. Local adjustment is still +1 -- displays 1+1 = **2** (wrong)
5. Any further re-render or refetch keeps compounding

### Solution
Reset `likeAdjustments` whenever the `shorts` prop updates with fresh data from the server. This way the optimistic bump is only temporary until real data arrives.

### Technical Details

**File: `src/components/community/MobileShortsFeed.tsx`**

- Add a `useEffect` that clears the `likeAdjustments` map whenever the `shorts` array reference changes (which happens after query invalidation brings fresh data)

```tsx
// Clear optimistic adjustments when fresh data arrives from server
useEffect(() => {
  setLikeAdjustments(new Map());
}, [shorts]);
```

This is a single 3-line addition. The flow becomes:

1. Video at 0 likes
2. Tap heart -- adjustment +1 -- shows 1
3. DB updates, query refetches, `shorts` prop updates with likes=1
4. Effect fires, clears adjustments -- shows 1+0 = **1** (correct)

