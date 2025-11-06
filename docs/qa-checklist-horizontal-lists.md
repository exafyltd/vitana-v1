# QA Checklist - Horizontal Lists Unified Migration

## Critical Blockers (Must Pass Before Production)

### Dimensions & Layout

- [ ] **StandardHorizontalCard**: `min-h-[88px]`
- [ ] **VisualHorizontalCard**: `min-h-[160px]`
- [ ] **Padding**: Both variants use `px-4 py-3` (16px horizontal, 12px vertical)
- [ ] **Gap**: Cards use `gap-3` (12px between cards)
- [ ] **Visual media width**: 36% on `≥1024px` screens
- [ ] **Visual media stacking**: Image stacks on top below 1024px
- [ ] **Visual media aspect**: Default 16:9 (56.25% padding-bottom), 4:3 option (75%)
- [ ] **Rounded corners**: 12px (`rounded-xl`)
- [ ] **Image treatment**: `object-cover`, `lazy` loading, reserved height (no CLS)

### Typography

- [ ] **Title**: 15px, semibold, 2-line clamp (`text-[15px] font-semibold line-clamp-2`)
- [ ] **Description**: 13.5px, 2-line clamp (`text-[13.5px] line-clamp-2`)
- [ ] **Metadata**: 12px (`text-[12px]`)
- [ ] **Badges**: 11px text, h-5 height, px-2 padding (`text-[11px] h-5 px-2`)

### States & Motion

- [ ] **Hover**: 2px accent rail appears on left (using domain token color)
- [ ] **Hover**: `shadow-xl` and `border-accent/40`
- [ ] **Focus ring**: `ring-1 ring-[hsl(var(--accent))]/60` (no outline jitter)
- [ ] **Animations**: All transitions use `200ms ease-out`
- [ ] **Standard expansion**: Only Standard cards expand inline (Visual opens modal/page)
- [ ] **Visual hover**: Image scales to 105% (`scale-105`)

### Actions & Interaction

- [ ] **Primary action**: Right side, visible on both variants
- [ ] **Secondary actions**: Kebab menu (DropdownMenu)
- [ ] **Standard expansion**: Enter/Space toggle, Esc collapses
- [ ] **Visual CTA**: Opens modal/page, no inline expansion
- [ ] **Tab order**: Left to right (no skip, no reverse)

### Accessibility

- [ ] **Structure**: `<article>` > `<button>` (header) + `<region>` (expanded body for Standard)
- [ ] **ARIA**: `aria-expanded` on Standard card headers
- [ ] **ARIA**: `aria-controls` and `aria-labelledby` on Standard expanded regions
- [ ] **Keyboard**: Enter/Space toggle Standard expansion
- [ ] **Keyboard**: Esc collapses expanded Standard cards
- [ ] **Keyboard**: Tab order preserved (left→right)
- [ ] **Focus ring**: `ring-1 ring-[hsl(var(--accent))]/60` visible on focus
- [ ] **No outline jitter**: No `outline` property, only `ring-*` classes
- [ ] **Lighthouse score**: ≥95% on all screens
- [ ] **Axe DevTools**: 0 critical violations

### RTL Support

- [ ] **Accent rail**: Flips to right side in RTL mode (`rtl:border-r-2 rtl:border-l-0`)
- [ ] **Icon padding**: Flips in RTL mode (`rtl:pr-0 rtl:pl-3` for left icons)
- [ ] **Layout**: Grid columns flip correctly in RTL
- [ ] **Text alignment**: Natural (start/end instead of left/right)
- [ ] **No horizontal scroll**: Body does not overflow horizontally in RTL

### Dark Mode

- [ ] **All colors**: Use semantic tokens from `index.css` (no hardcoded colors)
- [ ] **Glass effect**: Visible in dark mode (`bg-white/5 backdrop-blur-sm`)
- [ ] **Borders**: Visible in dark mode (`border-white/10`)
- [ ] **Text**: Readable contrast in dark mode (use `text-foreground`, `text-muted-foreground`)
- [ ] **Accent rail**: Uses tokenized color (`hsl(var(--accent))`)

### Performance

- [ ] **Viewport packing**: 6-7 rows visible per 1080p viewport (1920x1080)
- [ ] **No CLS**: Images load without layout shift (reserved height via padding-bottom)
- [ ] **Lazy loading**: Images use `loading="lazy"` attribute
- [ ] **Skeletons**: Show 3-5 skeleton rows while loading
- [ ] **Skeleton timing**: Skeletons disappear when real content loads
- [ ] **Virtualization**: Enabled for lists ≥30 items (disabled when any card expanded)
- [ ] **Infinite scroll**: Sentinel observer with `rootMargin: "600px"`
- [ ] **Smooth animations**: All transitions complete in 200ms ease-out

### Analytics

- [ ] **horizontal_list_view**: Logged on mount with `{ variant, screenId, listId, value: itemCount }`
- [ ] **horizontal_card_view**: Logged at 50% visibility with `{ variant, screenId, cardId }`
- [ ] **horizontal_card_expand**: Logged on Standard expansion with `{ variant, screenId, cardId, value: "true"|"false" }`
- [ ] **horizontal_card_cta**: Logged on CTA click with `{ variant, screenId, cardId, actionId }`
- [ ] **horizontal_list_load_more**: Logged on infinite scroll with `{ variant, screenId, listId, newItemCount }`
- [ ] **No PII**: All payloads contain only IDs, no names/emails/messages/biomarkers
- [ ] **PII sanitization**: `containsPII()` and `hashId()` functions work correctly

### Screens to Test

- [ ] **/inbox/reminder** - StandardHorizontalCard (collapsed & expanded)
- [ ] **/memory/timeline** - StandardHorizontalCard (collapsed & expanded)
- [ ] **/home/aifeed** (Activity tab) - VisualHorizontalCard (with motivational dividers)
- [ ] **/home/aifeed** (Routines tab) - VisualHorizontalCard

### Feature Flag

- [ ] **Flag exists**: `enableUnifiedHorizontalLists` in `src/lib/feature-flags.ts`
- [ ] **Fallback**: Old components (`VisualActivityFeed`, `VisualRoutinesGrid`) still work when flag off
- [ ] **Staging**: Flag enabled in staging environment only
- [ ] **Rollout plan**: 100% staging → QA signoff → 10% prod → 100% prod after 24-48h clean metrics
- [ ] **Rollback**: Can flip flag off to revert instantly

### Visual Regression Tests

- [ ] **reminder-standard-collapsed.png** - Snapshot exists
- [ ] **reminder-standard-expanded.png** - Snapshot exists
- [ ] **aifeed-visual-first-viewport.png** - Snapshot exists
- [ ] **aifeed-visual-scrolled.png** - Snapshot exists
- [ ] **aifeed-visual-dark.png** - Snapshot exists
- [ ] **aifeed-visual-rtl.png** - Snapshot exists
- [ ] **All snapshots**: Pass Playwright visual regression (maxDiffPixels < 150)

### Motivational Dividers (AI Feed Activity Only)

- [ ] **Injection**: Dividers inserted at indices [3, 7, 11, ...]
- [ ] **Component**: Uses `DividerCard` component
- [ ] **Height**: 88px (matches StandardHorizontalCard rhythm)
- [ ] **Style**: Subtle glass strip, emoji + 12px copy
- [ ] **A11y**: `role="separator"`, `aria-hidden="true"`, non-focusable
- [ ] **Analytics**: Does not emit events (non-interactive)
- [ ] **Virtualization**: Treated as 88px height by list container

## Nice-to-Have (Not Blockers)

- [ ] **Skeleton shimmer**: Animated shimmer effect on skeletons
- [ ] **Image preloading**: Priority loading for first 3 images
- [ ] **Smooth scroll**: Snap to card boundaries on scroll
- [ ] **Loading states**: Smooth fade-in when images load
- [ ] **Error states**: Fallback image when image fails to load

## Test Procedure

1. **Local Development**
   - Enable feature flag: `enableUnifiedHorizontalLists = true`
   - Run dev server: `npm run dev`
   - Test all screens above
   - Run A11y tests: `runHorizontalCardsA11yTests()` in console
   - Run RTL tests: `runHorizontalCardsRTLTests()` in console
   - Run analytics smoke test: Paste script from `docs/analytics-smoke-test.md`

2. **Playwright Tests**
   - Install: `npm install -D @playwright/test`
   - Run tests: `npx playwright test src/tests/horizontal-cards-visual.spec.ts`
   - Update snapshots: `npx playwright test --update-snapshots`
   - Attach screenshots to PR

3. **Lighthouse Audit**
   - Open each screen in Chrome
   - Open DevTools → Lighthouse tab
   - Run "Accessibility" audit
   - Verify score ≥95%
   - Attach report screenshots to PR

4. **Axe DevTools**
   - Install [axe DevTools extension](https://www.deque.com/axe/devtools/)
   - Open each screen
   - Run axe scan
   - Verify 0 critical violations
   - Attach report screenshots to PR

5. **Manual Testing**
   - Test all keyboard interactions (Tab, Enter, Space, Esc)
   - Test RTL mode: `document.documentElement.dir = "rtl"`
   - Test dark mode: Toggle theme switcher
   - Test viewport packing: Resize to 1920x1080
   - Verify no CLS when scrolling and images load
   - Check analytics events in localStorage

## Rollout Checklist

- [ ] All tests pass locally
- [ ] Playwright snapshots pass
- [ ] Lighthouse score ≥95%
- [ ] Axe DevTools 0 critical violations
- [ ] PR approved by design + engineering
- [ ] Deploy to staging
- [ ] Enable flag: `enableUnifiedHorizontalLists = true` (staging only)
- [ ] QA smoke test on staging (repeat all tests above)
- [ ] Monitor staging metrics for 24h (engagement, errors, performance)
- [ ] If metrics ≥ baseline → Deploy to prod
- [ ] Enable flag: 10% prod traffic (A/B test)
- [ ] Monitor prod metrics for 24-48h
- [ ] If metrics clean → Enable flag: 100% prod traffic
- [ ] Monitor for 1 week
- [ ] If stable → Deprecate old components (`VisualActivityFeed`, `VisualRoutinesGrid`)
- [ ] Remove old components after 2 weeks

## Rollback Plan

If issues detected in production:
1. Flip flag off: `enableUnifiedHorizontalLists = false`
2. Deploy rollback immediately
3. Old components take over instantly
4. No data loss, no downtime
5. Debug issues in staging
6. Re-enable flag when fixed
