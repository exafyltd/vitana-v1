

## Fix: Settings Drawer Label + Page Spacing

### Issues Found
1. **Drawer label shows "drawerNav.settings"** — the translation key was never added to en.json, de.json, or ar.json. All other drawer items have translations but `settings` was missed.
2. **Settings page feels "stuffed"** — compared to Events, the page uses tight padding (`px-2 pt-2`), compact card spacing (`space-y-3`, `py-1`), and small inner gaps throughout.

### Changes

#### 1. Add translation keys (3 files)
- `src/i18n/en.json` — add `"settings": "Settings"` to `drawerNav` block, remove stale `"deleteAccount"` entry
- `src/i18n/de.json` — add `"settings": "Einstellungen"` to `drawerNav` block, remove stale `"deleteAccount"` entry
- `src/i18n/ar.json` — add `"settings": "الإعدادات"` to `drawerNav` block

#### 2. Fix spacing in `src/pages/MobileSettings.tsx`
Adjust the page layout to match Events/other hubs:
- Outer container: `px-2 pt-2` → `px-4 pt-4` (more breathing room)
- Scrollable area: `space-y-4 px-1` → `space-y-5 px-0` (wider gaps between sections)
- Notification card inner: `p-4 space-y-3` → `p-5 space-y-4` (more internal padding)
- Category toggle rows: `py-1` → `py-2.5` (taller tap targets, less cramped)
- Push notification row: `py-1.5` → `py-2.5`
- Section title margin: `mb-1` → `mb-2`
- NavCard items: `py-3.5` → `py-4`, `gap-3` → `gap-4`
- Delete account section: `pt-4` → `pt-6`

### Files to edit
- `src/i18n/en.json` (line ~2421)
- `src/i18n/de.json` (line ~2426)
- `src/i18n/ar.json` (line ~62)
- `src/pages/MobileSettings.tsx`

