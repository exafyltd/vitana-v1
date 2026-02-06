

# Fix: German Translations for Autopilot + Showcase → Highlights

## Overview

Update German translations as requested and fix hardcoded strings in the mobile showcase header.

---

## Changes Required

### 1. Update Autopilot Profile Popup Translations

**File: `src/i18n/de.json`** (lines 735, 737, 739)

| Current | New |
|---------|-----|
| "Meine Biografie aufpolieren" | "Meine Bio optimieren" |
| "Meinen Archetyp aktualisieren" | "Profil anpassen" |
| "Mein Showcase hervorheben" | "Meine Highlights" |

---

### 2. Internationalize MobileShowcaseHeader Component

**File: `src/components/profile/mobile/MobileShowcaseHeader.tsx`**

Current hardcoded strings:
- `"Showcase"` (line 19) - Change to use translation
- `"Manage"` (line 28) - Change to use translation

Add `useTranslation` hook and replace with translation keys.

---

### 3. Add New Translation Keys

**File: `src/i18n/en.json`**

Add to `editProfile` namespace:
```json
"showcaseTitle": "Showcase",
"manage": "Manage"
```

**File: `src/i18n/de.json`**

Add to `editProfile` namespace:
```json
"showcaseTitle": "Highlights",
"manage": "Verwalten"
```

---

### 4. Update Other German "Showcase" References

**File: `src/i18n/de.json`**

| Line | Current | New |
|------|---------|-----|
| 760 | "...Biografie, Ihren Archetyp und Ihr Showcase." | "...Biografie, Ihren Archetyp und Ihre Highlights." |
| 2024 | "Bio, Archetyp & Showcase verbessern" | "Bio, Archetyp & Highlights verbessern" |

---

## Summary of All Changes

| File | Change |
|------|--------|
| `src/i18n/de.json` | Update 5 translation strings (3 autopilot popup + 2 showcase references) |
| `src/i18n/en.json` | Add 2 new keys for showcase header |
| `MobileShowcaseHeader.tsx` | Add useTranslation hook, replace hardcoded strings |

---

## Expected Result

- Autopilot popup shows: "Meine Bio optimieren", "Profil anpassen", "Meine Highlights"
- Mobile profile header shows: "Highlights" instead of "Showcase" in German
- "Manage" button shows: "Verwalten" in German

