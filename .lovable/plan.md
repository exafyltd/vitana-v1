

## Remove Duplicate Close Button

The `SheetContent` component from `src/components/ui/sheet.tsx` automatically renders a Radix close button (X) in the top-right corner. The `MobileCreatePostSheet` already has its own X button in the top-left of the header. This creates two close buttons.

### Change

**File: `src/components/profile/mobile/MobileCreatePostSheet.tsx`**

Add a custom class to `SheetContent` to hide the default Radix close button:

```tsx
<SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl p-0 flex flex-col [&>button.absolute]:hidden">
```

This CSS selector targets the auto-injected `<SheetPrimitive.Close>` button (which has `className="absolute right-4 top-4 ..."`) and hides it, keeping only the custom X in the header.

One line changed in one file.

