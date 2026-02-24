

## Make Profile Preview Fullscreen on Mobile

### Current Issue
The profile preview renders as a bottom sheet on mobile (default `ResponsiveDialogContent` behavior), showing a drag handle and not covering the full screen. The close button is a plain square X in the top-right corner.

### Changes

**File: `src/components/profile/ProfilePreviewDialog.tsx`**

1. Add `fullscreenOnMobile` prop to `ResponsiveDialogContent` -- this is already supported by the responsive-dialog component and switches from bottom sheet to `inset-0 rounded-none` fullscreen mode.

2. Add `hideCloseButton` prop and render a custom circular close button instead -- a `40px` circle with glassmorphism styling (`bg-white/10 backdrop-blur border-white/20`) positioned in the top-right corner with safe-area padding, matching the app's existing mobile design language.

3. Update the mobile content wrapper to use fullscreen-friendly styling -- remove the `p-4` padding and use flex-col layout with scrolling to fill the viewport.

### Technical Details

```tsx
// In the return JSX:
<ResponsiveDialogContent
  overlayClassName="z-[60]"
  fullscreenOnMobile
  hideCloseButton={isMobile}
  className={isMobile 
    ? "z-[60] bg-[hsl(222,47%,11%)]" 
    : "z-[60] max-w-6xl p-0 gap-0 overflow-hidden"}
>
  {/* Custom circular close button for mobile */}
  {isMobile && (
    <button
      onClick={closePreview}
      className="absolute right-3 z-20 w-10 h-10 rounded-full 
        bg-white/10 backdrop-blur-md border border-white/20 
        flex items-center justify-center text-white/80 
        hover:bg-white/20 transition-colors"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <X className="h-5 w-5" />
    </button>
  )}
  ...
```

The mobile content area will scroll naturally within the fullscreen container, and the circular X button will float fixed in the upper-right corner, respecting the device safe area.

