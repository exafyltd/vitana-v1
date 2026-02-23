

## Fix: Profile Tab Bar Showing Raw Translation Keys

### Problem
The profile tab bar displays raw keys (`profileTabs.posts`, `profileTabs.about`, etc.) instead of translated text. This happens in both English and German.

### Root Cause
The `profileTabs` key exists **twice** in both `en.json` and `de.json`. A duplicate was added at the bottom of each file (line ~2445) during the milestones feature implementation, containing only `{ "milestones": "Milestones" }`. In JSON, duplicate keys cause the second to overwrite the first, so all original tab labels (posts, about, media, groups, etc.) are lost.

### Fix

**`src/i18n/en.json`**
- Remove the duplicate `profileTabs` block at lines 2445-2447
- Add `"milestones": "Milestones"` into the original `profileTabs` block (around line 1213)

**`src/i18n/de.json`**
- Same fix: remove the duplicate `profileTabs` block at lines 2445-2447
- Add `"milestones": "Meilensteine"` into the original `profileTabs` block (around line 1213)

### Result
Tab bar will correctly show: **Posts | Uber Mich | Media | Groups** (DE) and **Posts | About | Media | Groups** (EN), and the new Milestones key will also remain available.
