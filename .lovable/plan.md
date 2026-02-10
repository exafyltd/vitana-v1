

# Rename "Showcase" to "Highlights" Across Profile

## Overview

Replace all user-facing instances of "Showcase" with "Highlights" in English. German already uses "Highlights" for most keys, so only English translation values and hardcoded strings need updating.

## Changes

### 1. English Translations (`src/i18n/en.json`)

| Key | Current | New |
|-----|---------|-----|
| `editProfile.showcaseTitle` | "Showcase" | "Highlights" |
| `editProfile.showcaseHint` | "Select posts and content to feature at the top of your profile" | "Select posts and content to highlight at the top of your profile" |
| `autopilot.suggestions.highlightShowcase` | "Highlight my Showcase" | "Highlight my Profile" |
| `autopilot.suggestions.profileSectionDesc` | "...bio, archetype, and showcase." | "...bio, archetype, and highlights." |
| `editProfile.autopilot.polishBio` | "Polish your bio, archetype & showcase" | "Polish your bio, archetype & highlights" |

### 2. Hardcoded Strings in Components

**`ShowcaseDrawer.tsx`** (line 15):
- `"Edit Showcase"` -> `translate('editProfile.editHighlights')` (add key: EN "Edit Highlights" / DE "Highlights bearbeiten")

**`ShowcaseForm.tsx`** (line 76):
- `"Showcase"` heading -> use `translate('editProfile.showcaseTitle')`

**`ShowcaseForm.tsx`** (line 78):
- Hardcoded description -> use translation key

**`ShowcaseForm.tsx`** (line 166):
- `"Save Showcase"` -> use translation key (add key: EN "Save Highlights" / DE "Highlights speichern")

**`VisibilityForm.tsx`** (line 114):
- `label: 'Showcase'` -> use translation key for "Highlights"

### 3. New Translation Keys

| Key | English | German |
|-----|---------|--------|
| `editProfile.editHighlights` | Edit Highlights | Highlights bearbeiten |
| `editProfile.saveHighlights` | Save Highlights | Highlights speichern |
| `editProfile.highlightsDesc` | Choose your best posts and media to feature at the top of your profile. Featured content appears in a highlights section and attracts more followers. | Waehlen Sie Ihre besten Beitraege und Medien aus, die oben in Ihrem Profil angezeigt werden. Hervorgehobene Inhalte erscheinen im Highlights-Bereich und ziehen mehr Follower an. |

### 4. Files Changed

| File | Action |
|------|--------|
| `src/i18n/en.json` | Update 5 existing values + add 3 new keys |
| `src/i18n/de.json` | Add 3 new keys |
| `src/components/profile/drawers/ShowcaseDrawer.tsx` | Replace hardcoded "Edit Showcase" with translation |
| `src/components/profile/editor/ShowcaseForm.tsx` | Replace 3 hardcoded strings with translation keys |
| `src/components/profile/editor/VisibilityForm.tsx` | Replace hardcoded "Showcase" label with "Highlights" |

Note: File names (ShowcaseForm, ShowcaseDrawer, etc.) and internal variable names remain unchanged -- only user-facing text is renamed.
