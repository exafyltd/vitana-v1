
## Fix Mobile Orb "Flashlight" Effect — Inline Style Override

### Problem Identified

The CSS "kill switch" (`filter: none !important`) is **not working** because the glow effects are applied via **inline `style` attributes** in React, which have higher specificity than any CSS selector.

```text
VitanalandPortalSeed.tsx renders:
┌──────────────────────────────────────────────────────────┐
│  <motion.div style={{ filter: 'blur(9px)', ... }} />     │
│  <motion.div style={{ boxShadow: '0 0 25px ...', ... }}  │
│  <div style={{ boxShadow: '0 0 11px ...', ... }} />      │
└──────────────────────────────────────────────────────────┘
           ↓
  CSS "filter: none !important" CANNOT override these
```

### Why CSS !important Fails

Inline styles have the highest specificity in CSS. Even `!important` cannot override:

```html
<!-- Rendered by React -->
<div style="filter: blur(9px)">...</div>

<!-- CSS rule (ignored!) -->
.vitana-orb * { filter: none !important; }
```

The browser prioritizes the inline `style` attribute over any stylesheet rule.

### Solution: Component-Level Mobile Detection

Modify `VitanalandPortalSeed.tsx` to detect mobile and **conditionally disable** the heavy halo/blur effects when rendering at `size="nav"` on mobile.

### Implementation Steps

#### Step 1: Add Mobile Detection Hook Import

In `VitanalandPortalSeed.tsx`, import the existing mobile detection hook:

```tsx
import { useIsMobile } from '@/hooks/use-mobile';
```

#### Step 2: Detect Mobile and Size Condition

Inside the component, check if we're on mobile AND using nav size:

```tsx
const isMobile = useIsMobile();
const isMobileNav = isMobile && size === 'nav';
```

#### Step 3: Conditionally Disable Heavy Effects

When `isMobileNav` is true:

| Element | Normal Behavior | Mobile Nav Behavior |
|---------|-----------------|---------------------|
| Outer halo layer | `filter: blur(9px)`, `opacity: 0.2` | `filter: none`, `opacity: 0` (hidden) |
| Second halo layer | `filter: blur(11px)`, `opacity: 0.1` | `filter: none`, `opacity: 0` (hidden) |
| Thin halo ring | `filter: blur(1px)` | `filter: none`, `opacity: 0` (hidden) |
| Core layers | `boxShadow: 0 0 25px...` | `boxShadow: none` |
| Nebula clouds | `filter: blur(6-9px)` | Smaller blur or hidden |

The orb's internal visuals (glass shell, specular highlights, aurora paths) remain visible — only the "bleeding" halo/glow layers are disabled.

#### Step 4: Apply Changes to Halo Layers (lines 129-186)

For the outer halo:

```tsx
<motion.div
  className="absolute rounded-full"
  style={{
    inset: `${config.outerHaloInset}px`,
    background: isMobileNav ? 'transparent' : (isError ? ... : ...),
    filter: isMobileNav ? 'none' : `blur(${config.outerBlur}px)`,
    transform: 'scale(1.08, 1)',
    opacity: isMobileNav ? 0 : undefined,
  }}
  // ...
/>
```

Similar changes for:
- Second halo layer (lines 150-166)
- Thin halo ring (lines 169-186)

#### Step 5: Apply Changes to Core Layers (lines 472-540)

For the outer core:

```tsx
<motion.div
  style={{
    // ...
    filter: isMobileNav ? 'none' : `blur(${24 * config.nebulaScale}px)`,
    boxShadow: isMobileNav ? 'none' : `0 0 ${60 * config.nebulaScale}px ...`,
  }}
/>
```

Similar changes for inner core and micro core.

#### Step 6: Clean Up CSS Kill Switch (Optional)

Once the component-level fix is in place, the CSS kill switch in `index.css` becomes redundant but can be kept as a safety net. The `::before` pseudo-element aura can be preserved to add a subtle, controlled glow.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/audio/VitanalandPortalSeed.tsx` | Add mobile detection, conditionally disable halo/blur/shadow effects for `isMobileNav` |
| `src/index.css` | Keep existing rules as safety net (optional cleanup later) |

### Technical Details

The component will check:

```tsx
const isMobile = useIsMobile();
const isMobileNav = isMobile && size === 'nav';

// For each halo layer:
style={{
  filter: isMobileNav ? 'none' : `blur(${config.outerBlur}px)`,
  opacity: isMobileNav ? 0 : undefined,
}}

// For core layers with boxShadow:
style={{
  boxShadow: isMobileNav ? 'none' : `0 0 ${spread}px ${color}`,
  filter: isMobileNav ? 'none' : `blur(${amount}px)`,
}}
```

### Visual Result

```text
BEFORE (Current - Flashlight):
┌────────────────────────────────────────┐
│    Card text washed out by glow        │
│         ╭───────────────╮              │
│     ░░░░│               │░░░░          │
│   ░░░░░░│    ◉ ORB      │░░░░░░        │
│     ░░░░│               │░░░░          │
│         ╰───────────────╯              │
│    (inline blur/shadow bleeding)       │
└────────────────────────────────────────┘

AFTER (Fixed):
┌────────────────────────────────────────┐
│    Card text clearly visible           │
│            ╭─────╮                     │
│            │◉ORB │ (glass shell only)  │
│            ╰─────╯                     │
│    + subtle CSS ::before aura          │
└────────────────────────────────────────┘
```

### Acceptance Criteria

- On mobile, halo does not wash out any card text
- Halo stays tight: ≤ ~10px beyond orb edge (via CSS `::before`)
- No harsh cropped circle edge
- Works across small + large phones
- Desktop/large orb sizes remain unchanged
