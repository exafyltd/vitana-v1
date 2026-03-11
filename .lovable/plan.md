
# Change Health action button to use Plus icon (consistency with other screens)

## Problem
The mobile Health screen uses an Upload icon (`<Upload className="h-4 w-4" />`) for its primary action button, while all other mobile screens (Wallet, Business Hub, etc.) use a Plus icon (`<Plus className="h-4 w-4" />`). This breaks visual consistency.

## Fix

**`src/pages/Health.tsx`** - Change lines 220-228:

Current:
```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
  onClick={() => setUploadSheetOpen(true)}
>
  <Upload className="h-4 w-4" />
  {translate('health.upload', 'Upload')}
</Button>
```

Change to:
```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-9 px-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shrink-0"
  onClick={() => setUploadSheetOpen(true)}
>
  <Plus className="h-4 w-4" />
  <span className="text-sm">{translate('buttons.create', 'Add')}</span>
</Button>
```

Also update imports to add `Plus` (already imported in the file).

## Translation
Uses existing key `buttons.create` with fallback "Add", consistent with Business Hub pattern (line 179 of BusinessHub.tsx uses same pattern).
