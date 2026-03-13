

## Fix Chat Scrolling Performance

### Root Causes Identified

1. **`isUserNearBottom` is React state** (line 126) — every scroll event calls `setIsUserNearBottom()`, triggering a full re-render of the entire message list on every scroll tick.

2. **ResizeObserver reads stale `isUserNearBottom` state** (line 469) — it's in the dependency array, so the observer is torn down and recreated every time scroll state changes, compounding the re-render issue.

3. **Duplicate `markAsRead` effects** (lines 359-381 and 384-409) — both have identical deps and fire on every `messages` change, doubling side-effect work.

4. **`console.log` on every render** (lines 113-121, 157-165, 205, 257, 269-276, 974-980) — adds overhead on every scroll-triggered re-render.

5. **`handleScroll` not throttled** — fires on every native scroll event (can be 60+ times/sec).

6. **`paddingBottom: var(--composer-h, 56px)` on desktop** (line 1081) — adds dead space since desktop composer is inline, not portaled.

### Changes in `src/components/messages/ConversationView.tsx`

**1. Replace `isUserNearBottom` state with a ref**

```typescript
// Line 126: change from
const [isUserNearBottom, setIsUserNearBottom] = useState(true);
// to
const isUserNearBottomRef = useRef(true);
```

No re-renders on scroll. All readers (`scrollToBottom`, ResizeObserver, auto-scroll effect) read from the ref instead.

**2. Throttle `handleScroll` with `requestAnimationFrame`**

```typescript
const rafRef = useRef<number | null>(null);

const handleScroll = useCallback(() => {
  if (rafRef.current) return; // already scheduled
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    const el = scrollRef.current;
    if (!el) return;
    isUserNearBottomRef.current = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
    if (el.scrollTop <= 0) {
      handleScrollToTop();
    }
  });
}, [handleScrollToTop]);
```

**3. Fix ResizeObserver — remove state dependency**

Read from `isUserNearBottomRef.current` instead of `isUserNearBottom` state. Remove `isUserNearBottom` from deps array so the observer is stable.

**4. Fix auto-scroll effect for new messages**

Replace the effect at line 426 that depends on `isUserNearBottom` state. Instead, use a `prevMessageCount` ref to detect new messages and only scroll if the ref says user is at bottom:

```typescript
const prevMessageCountRef = useRef(messages.length);
useEffect(() => {
  if (messages.length > prevMessageCountRef.current && isUserNearBottomRef.current) {
    scrollToBottom(false);
  }
  prevMessageCountRef.current = messages.length;
}, [messages.length, scrollToBottom]);
```

**5. Remove duplicate markAsRead effect**

Delete lines 384-409 (identical to lines 359-381).

**6. Remove render-time console.logs**

Remove debug `console.log` calls at lines 113-121, 157-165, 205, 257, 269-276, 974-980. Keep error-level logs.

**7. Conditional `paddingBottom` for mobile only**

```typescript
style={{ paddingBottom: isMobile ? 'var(--composer-h, 56px)' : undefined }}
```

**8. Initial scroll — update ref, not state**

In the `useLayoutEffect` at line 435, replace `setIsUserNearBottom(true)` with `isUserNearBottomRef.current = true`.

### Parent layout check

The parent containers in `Messages.tsx` already have correct constraints: `h-[calc(100dvh-200px)] flex flex-col min-h-0 overflow-hidden` and ConversationView gets `className="flex-1 min-h-0 min-w-0"`. No changes needed there.

### What stays untouched
- `useGlobalMessages.ts` — correct
- `chatPersistCache.ts` — correct
- `Messages.tsx` — layout already correct
- All swipe/gesture logic — unchanged
- ComposerDock portal logic — already correct

