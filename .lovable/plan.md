

# Add "Delete Account" Link to Login Footer

## What
Add a "Delete Account" link to the Maxina portal login footer, changing it from `Privacy · Terms · Help` to `Privacy · Terms · Delete Account · Help`.

## Changes

### `src/pages/portals/MaxinaPortal.tsx` (lines 797-798)
After the "Terms" link and its separator, insert a new "Delete Account" link and separator before "Help":

```tsx
<span className="text-white/30">·</span>
<Link to="/delete-account" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
  Delete Account
</Link>
```

This uses the exact same styling as the existing Privacy, Terms, and Help links. The `/delete-account` route already exists and renders the `DeleteAccount` component.

**No other files need changes** — the `Auth.tsx` and `AuthPages.tsx` login pages don't have this footer pattern (they were the generic auth pages, not the Maxina portal login).

