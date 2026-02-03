
## Internationalize "Edit Identity" Dialog + Remove Cover Photo + Add Personality Descriptor

### Problem
1. The "Edit Identity" dialog displays hardcoded English text even when German is selected
2. The Cover Photo section is obsolete (now using front/back ID card style)
3. Users cannot edit their "personality descriptor" (longevity archetype like "The Mindful Mover")

---

### Changes Overview

#### 1. Database Migration
Add `longevity_archetype` column to the `profiles` table:
```sql
ALTER TABLE profiles ADD COLUMN longevity_archetype TEXT;
```

#### 2. Translation Keys
Add new keys under `profileEditor.identity` namespace in both `de.json` and `en.json`:

**German (de.json):**
```json
"identity": {
  "editIdentity": "Identität bearbeiten",
  "title": "Identität",
  "description": "Verwalten Sie Ihren Anzeigenamen, Handle und Profilbilder.",
  "profilePicture": "Profilbild",
  "displayName": "Anzeigename",
  "displayNamePlaceholder": "Ihr Anzeigename",
  "handle": "Handle",
  "handlePlaceholder": "ihrhandle",
  "handleDescription": "Ihr Handle wird in Ihrer öffentlichen Profil-URL verwendet: /u/@{handle}",
  "personalityDescriptor": "Persönlichkeitsbeschreibung",
  "personalityDescriptorPlaceholder": "z.B. The Mindful Mover, Der Achtsame Bewegte",
  "personalityDescriptorDescription": "Eine kurze Beschreibung, die Ihren Wellness-Stil charakterisiert",
  "upload": "Hochladen",
  "uploading": "Hochladen...",
  "remove": "Entfernen",
  "avatarUploaded": "Profilbild hochgeladen",
  "avatarUploadedDesc": "Ihr Profilbild wurde aktualisiert.",
  "uploadFailed": "Hochladen fehlgeschlagen",
  "uploadFailedDesc": "Bild konnte nicht hochgeladen werden. Bitte erneut versuchen.",
  "identityUpdated": "Identität aktualisiert",
  "identityUpdatedDesc": "Ihre Identitätsinformationen wurden erfolgreich gespeichert."
}
```

**English (en.json):**
```json
"identity": {
  "editIdentity": "Edit Identity",
  "title": "Identity",
  "description": "Manage your display name, handle, and profile images.",
  "profilePicture": "Profile Picture",
  "displayName": "Display Name",
  "displayNamePlaceholder": "Your display name",
  "handle": "Handle",
  "handlePlaceholder": "yourhandle",
  "handleDescription": "Your handle will be used in your public profile URL: /u/@{handle}",
  "personalityDescriptor": "Personality Descriptor",
  "personalityDescriptorPlaceholder": "e.g., The Mindful Mover, The Zen Warrior",
  "personalityDescriptorDescription": "A short phrase that characterizes your wellness style",
  "upload": "Upload",
  "uploading": "Uploading...",
  "remove": "Remove",
  "avatarUploaded": "Avatar uploaded",
  "avatarUploadedDesc": "Your profile picture has been updated.",
  "uploadFailed": "Upload failed",
  "uploadFailedDesc": "Failed to upload image. Please try again.",
  "identityUpdated": "Identity updated",
  "identityUpdatedDesc": "Your identity information has been saved successfully."
}
```

---

### Files to Modify

#### 1. `src/components/profile/editor/IdentityForm.tsx`
- Import `useTranslation` hook
- **Remove entire Cover Photo section** (lines 145-181)
- Remove `coverUrl` state and related handlers (`handleCoverUpload`)
- Add new `longevityArchetype` state field
- Add new input field for Personality Descriptor
- Replace all hardcoded strings:
  - `"Identity"` → `translate('profileEditor.identity.title')`
  - `"Manage your display name, handle, and profile images."` → `translate('profileEditor.identity.description')`
  - `"Profile Picture"` → `translate('profileEditor.identity.profilePicture')`
  - `"Upload"` → `translate('profileEditor.identity.upload')`
  - `"Uploading..."` → `translate('profileEditor.identity.uploading')`
  - `"Remove"` → `translate('profileEditor.identity.remove')`
  - `"Display Name"` → `translate('profileEditor.identity.displayName')`
  - `"Your display name"` → `translate('profileEditor.identity.displayNamePlaceholder')`
  - `"Handle"` → `translate('profileEditor.identity.handle')`
  - `"yourhandle"` → `translate('profileEditor.identity.handlePlaceholder')`
  - Handle URL description → `translate('profileEditor.identity.handleDescription')`
  - Toast messages → translated keys

#### 2. `src/components/profile/drawers/IdentityDrawer.tsx`
- Import `useTranslation` hook
- Update `formData` state to include `longevityArchetype` instead of `coverUrl`
- Update database upsert to save `longevity_archetype` instead of `cover_url`
- Replace hardcoded strings:
  - `"Edit Identity"` → `translate('profileEditor.identity.editIdentity')`
  - `"Cancel"` → `translate('profileEditor.cancel')`
  - `"Save Changes"` → `translate('profileEditor.save')`
  - `"Saving..."` → `translate('profileEditor.saving')`
  - Toast messages → `translate('profileEditor.identity.identityUpdated')`, etc.

#### 3. `src/i18n/de.json`
- Add `identity` sub-namespace under `profileEditor` with all German translations

#### 4. `src/i18n/en.json`
- Add matching `identity` sub-namespace with English translations

---

### New Personality Descriptor Field UI

The new field will appear after Handle:

```text
┌─────────────────────────────────────┐
│ Personality Descriptor              │
│ ┌─────────────────────────────────┐ │
│ │ The Mindful Mover               │ │
│ └─────────────────────────────────┘ │
│ A short phrase that characterizes   │
│ your wellness style                 │
└─────────────────────────────────────┘
```

---

### Technical Notes

1. **Database**: Need to add `longevity_archetype` column to `profiles` table
2. **IdentityForm props interface**: Update `onDataChange` to pass `longevityArchetype` instead of `coverUrl`
3. The personality descriptor (archetype) is displayed on the profile ID card next to the handle (e.g., "@daniela-kper · The Mindful Mover")
4. Keep the upload functionality for avatars - only remove cover photo section

---

### Expected Result
When German is selected:
- Dialog title shows **"Identität bearbeiten"**
- Section title shows **"Identität"**
- Labels in German: Profilbild, Anzeigename, Handle, Persönlichkeitsbeschreibung
- Buttons: Hochladen, Entfernen, Speichern, Löschen
- No Cover Photo section
- New editable field for the personality descriptor
