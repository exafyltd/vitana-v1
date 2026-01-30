

## Fix Displaced Mobile Orb Aura

### Root Cause Identified

The "flashlight" effect appearing **displaced above** the orb is caused by the CSS `::before` pseudo-element aura being positioned incorrectly.

**The Problem:**

```text
MobileFixedOrb structure:
┌──────────────────────────────────────────┐
│ .vitana-orb (motion.div)                 │ ← NO explicit width/height
│   ┌─────────────────────────────────┐    │
│   │ [role="button"] div             │    │
│   │   ┌──────────────────────────┐  │    │
│   │   │ VitanalandPortalSeed     │  │    │   ← 60x60px
│   │   │       ◉ ORB              │  │    │
│   │   └──────────────────────────┘  │    │
│   └─────────────────────────────────┘    │
└──────────────────────────────────────────┘

CSS ::before pseudo-element:
- position: absolute
- left: 50%; top: 50%
- transform: translate(-50%, -50%)
- width/height: clamp(86px, 18vw, 140px)  ← LARGER than orb

But .vitana-orb has NO explicit dimensions!
→ The "50% top" of the container box ≠ visual center of the orb
→ The ::before aura appears DISPLACED ABOVE the orb
```

The container's natural box size (from wrapped content) doesn't match where we expect the orb's visual center to be.

### Solution

**Option A: Give the container explicit dimensions matching the orb**

Add explicit width/height to the `.vitana-orb` container in CSS so the `::before` correctly centers on the orb:

```css
@media (max-width: 768px) {
  .vitana-orb,
  [data-vitana-orb="true"],
  #vitana-orb,
  .OrbFloatingButton {
    /* ... existing positioning ... */
    
    /* Add explicit dimensions to match the nav-size orb (60x60px) */
    width: 60px !important;
    height: 60px !important;
  }
}
```

**Option B: Remove the ::before aura entirely (simplest)**

Since we've already applied the component-level kill switch to disable all blur/boxShadow effects inside `VitanalandPortalSeed` when `isMobileNav` is true, the orb will still look clean without any external aura. We can simply remove the `::before` pseudo-element entirely:

```css
/* REMOVE this entire block */
.vitana-orb::before,
[data-vitana-orb="true"]::before,
#vitana-orb::before,
.OrbFloatingButton::before {
  /* ... delete all ... */
}
```

**Option C: Use Option A + fix the ::before size**

If we want to keep a subtle aura, set the container dimensions AND tighten the `::before` to be smaller than the orb (no bleed):

```css
.vitana-orb::before,
[data-vitana-orb="true"]::before {
  /* Tighten to ~56px (slightly smaller than 60px orb) */
  width: 56px;
  height: 56px;
  filter: blur(10px) !important;
  background: radial-gradient(circle,
    rgba(76, 200, 244, 0.12) 0%,
    rgba(76, 200, 244, 0.06) 50%,
    transparent 80%
  );
}
```

### Recommended Approach

**Use Option B (remove ::before entirely)** for now. The orb's glass shell and internal visuals are still visible on mobile, so it remains recognizable. Once the flashlight is confirmed gone, we can optionally re-add a much smaller, correctly-positioned aura.

### Files to Modify

| File | Change |
|------|--------|
| `src/index.css` | Remove the `::before` pseudo-element block entirely (lines 608-629) |
| `src/components/mobile/MobileFixedOrb.tsx` | Optionally add inline `width: 60px; height: 60px` to the container for future aura support |

### Implementation Steps

1. **Remove the ::before pseudo-element CSS**
   - Delete lines 608-629 in `src/index.css`
   - This eliminates the displaced glow source

2. **Verify the flashlight is gone**
   - Check `/home` on mobile
   - Confirm no wash-out on Events feed

3. **(Optional) Add explicit container dimensions**
   - Add `width: 60px !important; height: 60px !important;` to `.vitana-orb` in the mobile block
   - This prepares for future controlled aura re-addition

4. **(Optional) Re-add tiny centered aura later**
   - If the orb looks too flat, we can add a much smaller, correctly-sized `::before` (56px, low opacity, small blur)

### Visual Result

```text
BEFORE (Current - Displaced Aura):
┌────────────────────────────────────────┐
│               ░░░░░░░                  │ ← Displaced aura (ABOVE orb)
│              ░░░░░░░░░                 │
│                                        │
│              ╭──────╮                  │
│              │ ◉ORB │                  │ ← Orb here
│              ╰──────╯                  │
└────────────────────────────────────────┘

AFTER (Fixed - No External Aura):
┌────────────────────────────────────────┐
│    Card text clearly visible           │
│              ╭──────╮                  │
│              │ ◉ORB │ (glass shell)    │
│              ╰──────╯                  │
│                                        │
└────────────────────────────────────────┘
```

### Acceptance Criteria

- Flashlight effect completely eliminated
- No displaced glow circle above the orb
- Orb remains visible with its internal glass shell
- Card text behind/near orb is clearly readable
- Desktop experience unchanged

