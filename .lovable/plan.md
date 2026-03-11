

# iPad Breakpoint Fix — Implementation Plan

## Changes

### 1. `src/hooks/use-mobile.tsx`
Change `MOBILE_BREAKPOINT` from `768` to `1024`.

### 2. `tailwind.config.ts`
Add `screens` override inside `theme.extend`:
```
screens: {
  sm: '640px',
  md: '1024px',
  lg: '1280px',
  xl: '1536px',
  '2xl': '1600px',
}
```

Two files changed. All existing `useIsMobile()` consumers and Tailwind `md:`/`lg:` responsive classes automatically shift — iPad Air 11" (820px) gets the mobile layout, phones unchanged.

