

# Hide ORB When Bottom Nav Is Absent (except Maxina screens)

## Rule
On mobile, the ORB should only be visible when the bottom navigation bar is rendered — or on Maxina intro/sign-in screens. Everywhere the bottom nav is hidden (shorts feed, event drawers, video player, live rooms, etc.), the ORB must also be hidden.

## Approach

Instead of adding suppression attributes to every individual overlay/screen, use a single **positive signal** from MobileBottomNav: it sets `data-bottom-nav-visible="true"` on `document.body` when it renders, and removes it when it doesn't (hidden routes, desktop, unmount). Then one CSS rule hides the ORB whenever that attribute is absent, with an exception for Maxina pages.

For fullscreen overlays like MobileShortsFeed that mount *on top of* the bottom nav (nav is still technically rendered underneath), set a `data-shorts-open` body attribute to override.

## Changes

### 1. `src/components/mobile/MobileBottomNav.tsx`
Add a `useEffect` that:
- Sets `document.body.dataset.bottomNavVisible = "true"` when the component renders (nav is visible)
- Removes the attribute on unmount or when `shouldHideNav` is true / not mobile

### 2. `src/components/community/MobileShortsFeed.tsx`
Add a `useEffect` on mount/unmount that sets/removes `document.body.dataset.shortsOpen = "true"` — since the bottom nav is still mounted underneath, we need this extra signal.

### 3. `src/index.css`
Add one new suppression block inside the mobile media query. Replace the individual chat/consent suppression blocks with a single unified rule:

```css
/* Hide ORB when bottom nav is not visible (except Maxina pages) */
body:not([data-bottom-nav-visible="true"]):not(.maxina-signin-page) .vtorb-fab,
... (all 8 selectors) ...
{
  z-index: 0 !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* Also suppress when shorts overlay is open */
body[data-shorts-open="true"] .vtorb-fab,
... (all 8 selectors) ...
{
  z-index: 0 !important;
  pointer-events: none !important;
  opacity: 0 !important;
}
```

The existing chat-screen and consent-dialog suppression rules can remain (belt-and-suspenders) or be removed since they're now covered by the bottom-nav rule. I'll keep them for safety.

## Files
- `src/components/mobile/MobileBottomNav.tsx` — add body attribute effect
- `src/components/community/MobileShortsFeed.tsx` — add body attribute on mount
- `src/index.css` — add two CSS suppression blocks

