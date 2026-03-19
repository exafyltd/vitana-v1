

## Fix: Paperclip (Attach) Button Not Responding to Taps

### Problem
The `PersistentGuideOrb` component renders a `fixed inset-0 z-[90]` overlay (`motion.div`) that periodically appears in the DOM. Even though it animates to `opacity: 0`, it still captures pointer/touch events because the element is in the DOM and has no `pointer-events: none`. This invisible overlay sits above the chat input area (z-50), blocking taps on the paperclip button and potentially other input elements.

The `AttachmentMenu` component itself is correctly wired -- it uses `ResponsivePopover` and should open a bottom sheet on mobile with options like Attach File, Send Funds, Calendar Invite, etc.

### Root Cause
In `src/components/vitanaland/PersistentGuideOrb.tsx`, line 40:
```
<motion.div className="fixed inset-0 z-[90]" ...>
```
This full-screen overlay at z-index 90 intercepts all touch events when present, even during exit animations (opacity going to 0).

### Fix

**File: `src/components/vitanaland/PersistentGuideOrb.tsx`**

Add `pointer-events: none` to the overlay `motion.div` so it never blocks interactions with elements beneath it. The overlay is purely visual (backdrop blur + tinted background), so it does not need to receive pointer events.

Change on line 40:
```
className="fixed inset-0 z-[90]"
```
to:
```
className="fixed inset-0 z-[90] pointer-events-none"
```

Also add `pointer-events-none` to the child div (line 47) for safety.

This is a one-line CSS class addition. No API or logic changes needed.

