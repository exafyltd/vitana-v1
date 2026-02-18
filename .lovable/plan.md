

## Rename "Live Channels" / "Live Kanäle" to "Live Rooms" in Drawer Navigation

### Changes

Two translation files need a single-line update each:

1. **`src/i18n/en.json`** -- line 2336: Change `"live": "Live Channels"` to `"live": "Live Rooms"`
2. **`src/i18n/de.json`** -- line 2336: Change `"live": "Live Kanäle"` to `"live": "Live Rooms"`

Both languages will display "Live Rooms" (kept in English per request).

### What stays unchanged
- Drawer nav config (`drawer-nav.config.ts`) -- the translation key `drawerNav.live` is unchanged
- Route (`/comm/live-rooms`) -- unchanged
- Arabic translations -- no `drawerNav` section exists in `ar.json`
