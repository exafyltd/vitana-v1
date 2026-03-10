

# Fix Help Link — Open Email to Support

## Change

### `src/pages/portals/MaxinaPortal.tsx` (line 803)
Change the `<Link to="/help">` to a regular `<a href="mailto:support@exafy.io">` tag, keeping the exact same styling. This opens the user's email client instead of navigating to a non-existent route.

```tsx
// Before
<Link to="/help" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">

// After
<a href="mailto:support@exafy.io" className="text-white/70 hover:text-white font-medium transition-colors tracking-wide">
  Help
</a>
```

One line change. No new files or routes needed.

