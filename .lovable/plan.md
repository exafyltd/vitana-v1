

# Lower the ORB on Mobile

## Change
In `src/index.css` line 615, reduce the mobile ORB's `bottom` offset so it sits lower — closer to the bottom nav rather than overlapping its top edge.

**Current** (line 615):
```css
bottom: calc(var(--appilix-bottom-nav-height, 72px) - 36px) !important;
```

**New**:
```css
bottom: calc(var(--appilix-bottom-nav-height, 72px) - 46px) !important;
```

This moves the ORB ~10px lower on mobile. Desktop rules (lines 578-587) remain untouched.

## File
- `src/index.css` — line 615 only

