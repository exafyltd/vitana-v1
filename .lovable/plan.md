

## Internationalize "Edit About" Dialog (Profile Screen)

### Problem
The "Edit About" dialog on the Profile screen displays hardcoded English text even when German is selected. All labels, buttons, placeholders, and visibility options need to be translated.

---

### Translation Mapping (User-Provided + Standard)

| English | German |
|---------|--------|
| Edit About | **Profil** |
| Cancel | **Löschen** |
| Save Changes | Speichern |
| Saving... | Speichern... |
| Location | Ort |
| Languages | Sprachen |
| Add a language | Sprache hinzufügen |
| Public | Öffentlich |
| Followers | Follower |
| Private | Privat |
| Bio | Bio |
| Links | Links |
| Add Link | Link hinzufügen |
| About | Über |
| Profile updated | Profil aktualisiert |
| Save failed | Speichern fehlgeschlagen |

---

### Files to Modify

#### 1. `src/i18n/de.json`
Add new `profileEditor` namespace with all German translations:

```json
"profileEditor": {
  "editAbout": "Profil",
  "aboutTitle": "Über",
  "aboutDescription": "Teilen Sie mehr über sich. Sie können steuern, wer jedes Feld sehen kann.",
  "bio": "Bio",
  "bioPlaceholder": "Teilen Sie Ihre Wellness-Reise, Leidenschaften und was Sie einzigartig macht...\n\nBeispiele:\n• 'Wellness-Enthusiast mit Leidenschaft für achtsames Leben und Community-Building 🌱'\n• 'Zertifizierter Ernährungsberater, der anderen hilft, ihr gesündestes Selbst zu entdecken'\n• 'Marathonläufer, Meditationslehrer und Fürsprecher für ausgewogenes Leben'",
  "location": "Ort",
  "locationPlaceholder": "z.B. Berlin, DE • München, DE • Remote",
  "links": "Links",
  "addLink": "Link hinzufügen",
  "linkLabelPlaceholder": "Bezeichnung (z.B. Website, Instagram, LinkedIn, Portfolio)",
  "linkUrlPlaceholder": "https://ihre-website.com oder @benutzername",
  "languages": "Sprachen",
  "addLanguage": "Sprache hinzufügen",
  "characters": "Zeichen",
  "words": "Wörter",
  "almostFull": "Fast voll",
  "goodLength": "Gute Länge",
  "visibility": {
    "public": "Öffentlich",
    "followers": "Follower",
    "private": "Privat"
  },
  "languageOptions": {
    "english": "Englisch",
    "german": "Deutsch",
    "spanish": "Spanisch",
    "french": "Französisch",
    "italian": "Italienisch",
    "portuguese": "Portugiesisch",
    "russian": "Russisch",
    "arabic": "Arabisch",
    "chinese": "Chinesisch",
    "japanese": "Japanisch"
  },
  "cancel": "Löschen",
  "save": "Speichern",
  "saving": "Speichern...",
  "profileUpdated": "Profil aktualisiert",
  "profileUpdatedDesc": "Ihre Informationen wurden erfolgreich gespeichert.",
  "saveFailed": "Speichern fehlgeschlagen",
  "saveFailedDesc": "Profil konnte nicht gespeichert werden. Bitte erneut versuchen.",
  "autopilot": {
    "quickSuggestions": "Autopilot Schnellvorschläge",
    "makeShorter": "Kürzer machen",
    "moreProfessional": "Professioneller",
    "moreInspirational": "Inspirierender",
    "suggestion": "Autopilot-Vorschlag"
  }
}
```

#### 2. `src/i18n/en.json`
Add matching English keys under `profileEditor` namespace:

```json
"profileEditor": {
  "editAbout": "Edit About",
  "aboutTitle": "About",
  "aboutDescription": "Share more about yourself. You can control who sees each field.",
  "bio": "Bio",
  "bioPlaceholder": "Share your wellness journey, passions, and what makes you unique...\n\nExamples:\n• 'Wellness enthusiast passionate about mindful living and community building 🌱'\n• 'Certified nutritionist helping others discover their healthiest selves'\n• 'Marathon runner, meditation teacher, and advocate for balanced living'",
  "location": "Location",
  "locationPlaceholder": "e.g., San Francisco, CA • London, UK • Remote",
  "links": "Links",
  "addLink": "Add Link",
  "linkLabelPlaceholder": "Label (e.g., Website, Instagram, LinkedIn, Portfolio)",
  "linkUrlPlaceholder": "https://your-website.com or @username",
  "languages": "Languages",
  "addLanguage": "Add a language",
  "characters": "characters",
  "words": "words",
  "almostFull": "Almost full",
  "goodLength": "Good length",
  "visibility": {
    "public": "Public",
    "followers": "Followers",
    "private": "Private"
  },
  "languageOptions": {
    "english": "English",
    "german": "German",
    "spanish": "Spanish",
    "french": "French",
    "italian": "Italian",
    "portuguese": "Portuguese",
    "russian": "Russian",
    "arabic": "Arabic",
    "chinese": "Chinese",
    "japanese": "Japanese"
  },
  "cancel": "Cancel",
  "save": "Save Changes",
  "saving": "Saving...",
  "profileUpdated": "Profile updated",
  "profileUpdatedDesc": "Your about information has been saved successfully.",
  "saveFailed": "Save failed",
  "saveFailedDesc": "Failed to save profile. Please try again.",
  "autopilot": {
    "quickSuggestions": "Autopilot Quick Suggestions",
    "makeShorter": "Make Shorter",
    "moreProfessional": "More Professional",
    "moreInspirational": "More Inspirational",
    "suggestion": "Autopilot suggestion"
  }
}
```

#### 3. `src/components/profile/drawers/AboutDrawer.tsx`
- Import `useTranslation` hook
- Replace all hardcoded strings with translation calls:
  - `"Edit About"` → `translate('profileEditor.editAbout')`
  - `"Cancel"` → `translate('profileEditor.cancel')`
  - `"Save Changes"` → `translate('profileEditor.save')`
  - `"Saving..."` → `translate('profileEditor.saving')`
  - Toast messages → `translate('profileEditor.profileUpdated')`, etc.

#### 4. `src/components/profile/editor/AboutForm.tsx`
- Import `useTranslation` hook
- Replace all labels and placeholders:
  - Section title `"About"` → `translate('profileEditor.aboutTitle')`
  - Description text → `translate('profileEditor.aboutDescription')`
  - Field labels (Bio, Location, Links, Languages) → translated
  - All placeholder text → translated
  - Visibility options (Public, Followers, Private) → translated using `translate('profileEditor.visibility.*')`
  - Character/word count labels → translated
  - Language option names in dropdown → translated using `translate('profileEditor.languageOptions.*')`

#### 5. `src/components/profile/AutopilotSuggestions.tsx`
- Import `useTranslation` hook
- Replace bio suggestion labels (for the `type === 'bio'` case used in AboutForm):
  - `"Autopilot Quick Suggestions"` → `translate('profileEditor.autopilot.quickSuggestions')`
  - `"Make Shorter"` → `translate('profileEditor.autopilot.makeShorter')`
  - `"More Professional"` → `translate('profileEditor.autopilot.moreProfessional')`
  - `"More Inspirational"` → `translate('profileEditor.autopilot.moreInspirational')`
  - Toast title → `translate('profileEditor.autopilot.suggestion')`

---

### Expected Result
After these changes, when German is selected:
- Dialog title shows **"Profil"**
- Cancel button shows **"Löschen"**
- Save button shows **"Speichern"**
- All labels (Bio, Ort, Sprachen, Links) are in German
- Visibility dropdown shows Öffentlich/Follower/Privat
- Language names in dropdown are in German (Englisch, Deutsch, etc.)
- Autopilot suggestions are in German

