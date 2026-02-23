
## Fix "Über Uns" to "Über Mich" on Profile Tabs

The profile "About" tab is currently translated as "Über Uns" (About Us), but since this is a personal profile, it should read "Über Mich" (About Me).

### Change

**`src/i18n/de.json`** -- Two lines to update:

- Line 1184: `profile.tabs.about` -- change `"Über Uns"` to `"Über Mich"`
- Line 1215: `profileTabs.about` -- change `"Über Uns"` to `"Über Mich"`

Note: Line 1566 (`settings.about`: `"Über uns"`) stays as-is since that refers to "About the app/company", not a personal profile.
