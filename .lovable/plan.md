

## Remove Edit (Pencil) Icon from Mobile Social Presence

### Summary
Remove the redundant pencil/edit button from the "Social Presence" section on mobile since users can now tap directly on social platform icons to connect or visit them.

---

### Current Behavior
- A pencil icon appears in the top-right corner of the Social Presence card when in edit mode
- This was previously needed to trigger a social editing flow
- Now, users can:
  - **Tap connected platforms** → Opens the profile in a new tab
  - **Tap unconnected platforms** → Opens the SocialMediaImportDialog directly

---

### Change

**File:** `src/components/profile/mobile/MobileIdCardBack.tsx`

Remove the edit button block (lines 120-130):

```tsx
// REMOVE THIS ENTIRE BLOCK:
{editMode && onEdit && (
  <Button
    variant="ghost"
    size="icon"
    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white z-10"
    onClick={onEdit}
  >
    <Pencil className="h-4 w-4" />
  </Button>
)}
```

Also update the empty state section (lines 215-223) to remove the "Connect Accounts" button that called `onEdit`, since users can use the unconnected platform icons instead:

```tsx
// REMOVE THIS BLOCK from empty state:
{editMode && onEdit && (
  <Button
    variant="outline"
    size="sm"
    onClick={onEdit}
    className="border-white/20 text-white/70 hover:bg-white/10"
  >
    {translate('socialImport.connectAccounts', 'Connect Accounts')}
  </Button>
)}
```

**Optional cleanup:** Remove unused `onEdit` prop from interface and remove `Pencil` from imports if no longer used.

---

### Result
- Cleaner UI without redundant edit button
- Users tap directly on platform icons for all actions
- Maintains full functionality for connecting new platforms

