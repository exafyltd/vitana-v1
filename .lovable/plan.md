
# Simplify Mobile Social Connection + German Translations

## Problem
On mobile's "Social Presence" card, clicking an unconnected platform (X, TikTok, YouTube) currently opens a generic drawer. The user wants it to work like desktop: clicking an icon should directly open a simple dialog to enter the social network URL.

Additionally, all popups need to be translated to German when German is selected.

## Solution Overview

### 1. Update MobileIdCardBack.tsx
Modify the mobile component to directly open the `SocialMediaImportDialog` when clicking on an unconnected platform, exactly like the desktop version (`ProfileIdCardBack.tsx`).

**Changes:**
- Import `SocialMediaImportDialog`, `useState`, and `useAuth`
- Add `dialogOpen` and `selectedPlatform` state
- Create a `handleConnect(platform)` function that sets the selected platform and opens the dialog
- Change unconnected platform buttons to call `handleConnect(platform)` instead of `onEdit`
- Render `SocialMediaImportDialog` at the bottom of the component

### 2. Add German Translations for Social Dialog
Create a new `socialImport` section in both `de.json` and `en.json` with all dialog text.

**German translations:**
| Key | German |
|-----|--------|
| dialogTitle | "{platform} Profil verbinden" |
| dialogDescription | "Verbinden Sie Ihr {platform}-Profil, um Ihre Vitana-Identität mit KI-gestützten Einblicken zu bereichern." |
| profileUrl | "{platform} Profil-URL" |
| bioLabel | "Bio / Über-Bereich" |
| bioOptional | "(Optional)" |
| cancel | "Abbrechen" |
| importProfile | "Profil importieren" |
| importing | "Wird importiert..." |
| urlRequired | "URL erforderlich" |
| urlRequiredDesc | "Bitte geben Sie Ihre {platform} Profil-URL ein" |
| importSuccess | "Import erfolgreich" |
| importSuccessDesc | "Ihr {platform}-Profil wurde importiert und mit KI-Einblicken angereichert." |
| importFailed | "Import fehlgeschlagen" |
| connect | "Verbinden:" |
| socialPresence | "Soziale Präsenz" |
| verifiedConnections | "Verifizierte Verbindungen in Ihrem digitalen Leben" |
| tapToVisit | "Tippen, um Profil zu besuchen" |
| noAccountsConnected | "Keine Social-Accounts verbunden" |
| connectAccounts | "Accounts verbinden" |
| connected | "Verbunden" |
| notLinked | "Nicht verknüpft" |

**Platform-specific help texts (German):**
- LinkedIn: "Wir verwenden KI, um Ihre Überschrift, Zusammenfassung und beruflichen Fähigkeiten zu extrahieren."
- Instagram: "Wir analysieren Ihre Bio, um Ihre Interessen und Lifestyle-Themen zu verstehen."
- TikTok: "Wir extrahieren Ihre Content-Themen und kreative Persönlichkeit aus Ihrer Bio."
- YouTube: "Wir identifizieren Ihre Content-Kategorien und Fachbereiche aus Ihrer Beschreibung."
- Facebook: "Wir extrahieren Ihre Interessen und Community-Beteiligung aus Ihrer Bio."
- X: "Wir analysieren Ihre Bio, um Ihre Themengebiete und Kommunikationsstil zu verstehen."

### 3. Update SocialMediaImportDialog.tsx
Modify the dialog component to use the `useTranslation` hook for all text strings.

**Changes:**
- Import `useTranslation` hook
- Replace all hardcoded English strings with `translate('socialImport.key', 'Fallback')` calls
- Use dynamic placeholder interpolation for platform names

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/profile/mobile/MobileIdCardBack.tsx` | Add dialog integration (state, handler, render dialog) |
| `src/components/profile/dialogs/SocialMediaImportDialog.tsx` | Add `useTranslation` hook for all text |
| `src/i18n/de.json` | Add `socialImport` section with German translations |
| `src/i18n/en.json` | Add `socialImport` section with English translations |

## Technical Details

### MobileIdCardBack.tsx Updates

```typescript
// Add imports
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { SocialMediaImportDialog } from "@/components/profile/dialogs/SocialMediaImportDialog";

// Add state inside component
const { user } = useAuth();
const [dialogOpen, setDialogOpen] = useState(false);
const [selectedPlatform, setSelectedPlatform] = useState<PlatformConfig | null>(null);

// Add handler
const handleConnect = (platform: PlatformConfig) => {
  setSelectedPlatform(platform);
  setDialogOpen(true);
};

// Change unconnected platform button onClick
onClick={() => handleConnect(platform)}  // Instead of: onClick={onEdit}

// Add dialog at component end
{selectedPlatform && (
  <SocialMediaImportDialog 
    open={dialogOpen}
    onOpenChange={setDialogOpen}
    platform={selectedPlatform.id}
    platformName={selectedPlatform.name}
    icon={selectedPlatform.icon}
    profileId={user?.id ?? profile.user_id ?? profile.id}
  />
)}
```

### SocialMediaImportDialog.tsx Updates

```typescript
// Add import
import { useTranslation } from "@/hooks/useTranslation";

// Inside component
const { translate } = useTranslation();

// Replace hardcoded text with translations
<DialogTitle>
  {icon}
  <span>{translate('socialImport.dialogTitle', 'Import {platform} Profile').replace('{platform}', platformName)}</span>
</DialogTitle>

<Button onClick={handleImport}>
  {importing ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {translate('socialImport.importing', 'Importing...')}
    </>
  ) : (
    translate('socialImport.importProfile', 'Import Profile')
  )}
</Button>
```

## Result
After implementation:
1. Mobile users can tap any unconnected social icon to immediately open a simple URL input dialog
2. All dialog text appears in German when German is the selected language
3. The experience matches desktop behavior exactly
