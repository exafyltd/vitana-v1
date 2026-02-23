

## Fix: Message Modal and Profile Preview Appearing Behind Event Drawer

### Root Cause

The event detail drawer (`MeetupDetailsDrawer`) uses a full-screen `Sheet` at `z-50`. Two interactive elements inside it -- the **Message Compose Modal** and the **Profile Preview Dialog** -- also render their Dialog at `z-50`. Since both the Sheet and Dialogs share the same z-index, the secondary dialogs appear behind the drawer overlay.

This is the same pattern already solved for the Share and Campaign dialogs (documented in the project's drawer-modal-stacking pattern).

### Solution

Apply `z-[60]` to both the overlay and content of the two affected dialogs so they stack above the event drawer.

### Changes

**1. `src/components/profile/shared/MessageComposeModal.tsx`**

- Add `overlayClassName="z-[60]"` to the `DialogContent` component
- Add `z-[60]` to the `DialogContent` className so the modal content also renders above the drawer

**2. `src/components/profile/ProfilePreviewDialog.tsx`**

- Add `overlayClassName="z-[60]"` to the `DialogContent` component
- Add `z-[60]` to the `DialogContent` className so the profile preview renders above the drawer
- This also fixes the "endless loading" issue -- the profile was loading fine but was visually hidden behind the drawer overlay, making it look stuck

### Why This Works

The `DialogContent` component already supports an `overlayClassName` prop (line 46-47 of dialog.tsx) that is passed through to `DialogOverlay`. By setting both the overlay and content to `z-[60]`, the secondary dialog fully covers the `z-50` drawer, matching the established pattern used by `UniversalShareDialog` and `CampaignDialog`.

