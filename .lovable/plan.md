
## Make Profile Preview and Message Compose Mobile-Friendly

Both the Profile Preview dialog and Message Compose modal currently use the standard centered `Dialog`, which doesn't adapt for mobile. They need to use the `ResponsiveDialog` component (bottom sheet on mobile, centered dialog on desktop) while maintaining the `z-[60]` stacking so they appear above the event drawer.

### Changes

**1. `src/components/ui/responsive-dialog.tsx`**

Add an `overlayClassName` prop to `ResponsiveDialogContent`, passed through to `ResponsiveDialogOverlay`. This enables z-index overrides (like `z-[60]`) needed when these dialogs open above a Sheet/Drawer.

**2. `src/components/profile/ProfilePreviewDialog.tsx`**

- Switch from `Dialog`/`DialogContent` to `ResponsiveDialog`/`ResponsiveDialogContent` with `ResponsiveDialogBody` for scrollable content
- On mobile: renders as a bottom sheet with vertically stacked ID cards (front then back), stats, and the "View Full Profile" button
- On desktop: keeps the current side-by-side two-card layout
- Apply `z-[60]` via both `overlayClassName` and `className` to maintain stacking above the event drawer
- Loading and error states remain the same

**3. `src/components/profile/shared/MessageComposeModal.tsx`**

- Switch from `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` to their `ResponsiveDialog` equivalents
- On mobile: renders as a bottom sheet with the recipient header sticky at top, textarea in scrollable body, and send/cancel buttons in a sticky footer
- On desktop: keeps the current centered modal design
- Apply `z-[60]` via both `overlayClassName` and `className`

### Technical Details

The `ResponsiveDialogOverlay` currently hardcodes `z-50`. Adding the `overlayClassName` prop follows the exact same pattern as the regular `DialogContent` component (line 46-47 of dialog.tsx). Both the overlay and content get `z-[60]` so they fully cover the event drawer's `z-50` Sheet.

No new dependencies needed. The `ResponsiveDialog` component already handles all mobile-specific behavior (bottom sheet slide-up, drag handle, safe area padding, sticky header/footer).
