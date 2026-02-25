

## Change "Über" to "Über mich" in Profile About Section

The screenshot shows two places displaying "Über" — the section heading and the edit button. Both come from translation keys in `de.json`.

### Changes

**File: `src/i18n/de.json`**

1. **Line 1703** — `editProfile.about`: Change `"Über"` to `"Über mich"` (used for both the section title and the edit button label in `ProfilePostsTab.tsx`)

2. **Line 2173** — `profileEditor.aboutTitle`: Change `"Über"` to `"Über mich"` (used in the `AboutForm.tsx` heading)

Two string changes in one file. No component changes needed.

