

## Fix Mobile Connected Apps: Popup i18n, Mobile Adaptation & Connect Action

### Issues Identified

Based on the screenshots and code analysis, there are three main problems:

| Issue | Root Cause |
|-------|------------|
| **1. ConnectAppPopup is not mobile-adapted** | Uses `Dialog` with `max-w-4xl` — a desktop modal instead of a mobile bottom sheet |
| **2. All text is English despite German selected** | `ConnectAppPopup.tsx` has 100% hardcoded English strings — no `useTranslation` hook used |
| **3. "Verbinden" button does nothing** | `MobileIntegrationDetailSheet.tsx` buttons have no `onClick` handlers |

---

## Solution Overview

### Part 1: Create Mobile-Friendly ConnectAppPopup

Replace the desktop `Dialog` with a responsive component that:
- Uses **Sheet** (bottom drawer) on mobile
- Keeps the **Dialog** behavior on desktop
- Uses the existing `integrationData.ts` instead of duplicate mock data

### Part 2: Add Full i18n Support

Add a new `connectedApps.popup` namespace with all required translations:

**New Keys:**
```json
{
  "connectedApps": {
    "popup": {
      "title": "Apps & Services verbinden",
      "searchPlaceholder": "Apps und Services suchen...",
      "categories": {
        "all": "Alle Apps",
        "health": "Gesundheit & Fitness",
        "calendar": "Kalender",
        "social": "Social",
        "productivity": "Produktivität"
      },
      "availableApps": "Verfügbare Apps",
      "verified": "Verifiziert",
      "connected": "Verbunden",
      "settings": "Einstellungen",
      "disconnect": "Trennen",
      "connect": "Verbinden",
      "done": "Fertig",
      "manageConnections": "Alle Verbindungen verwalten",
      "noResults": "Keine Apps gefunden"
    }
  }
}
```

### Part 3: Wire Connect/Disconnect Actions

The `MobileIntegrationDetailSheet` "Verbinden" button needs to:
1. For **social apps** (LinkedIn, Instagram, TikTok, etc.) → Open `SocialMediaImportDialog`
2. For **fitness apps** (Apple Health, Fitbit, etc.) → Show a toast/placeholder (future OAuth flow)
3. For **coming soon** apps → Show informational message

---

## Technical Implementation

### File 1: `src/components/ConnectAppPopup.tsx`

**Changes:**
1. Add `useIsMobile()` hook to detect mobile
2. Replace `Dialog` with conditional rendering:
   - **Mobile**: `Sheet` with `SheetContent side="bottom"`
   - **Desktop**: Keep `Dialog`
3. Add `useTranslation()` and replace all hardcoded strings
4. Use `integrationData.ts` instead of duplicate mock apps array
5. Simplify mobile layout (single-column card list, no ratings)

### File 2: `src/components/settings/MobileIntegrationDetailSheet.tsx`

**Changes:**
1. Add `onConnect` and `onDisconnect` props
2. Add `onClick` handlers to the action buttons
3. For social apps, call a new `handleSocialConnect` that opens `SocialMediaImportDialog`
4. Add toast notifications for non-social app actions (placeholder)

### File 3: `src/components/settings/MobileConnectedAppsView.tsx`

**Changes:**
1. Add state for `SocialMediaImportDialog`
2. Pass `onConnect` handler to `MobileIntegrationDetailSheet`
3. Handle different integration types with appropriate actions

### File 4: `src/i18n/de.json` & `src/i18n/en.json`

**Changes:**
Add the `connectedApps.popup` namespace with all new translation keys

---

## ConnectAppPopup Redesign (Mobile)

The mobile version will be a bottom sheet with:

```text
┌─────────────────────────────────────┐
│  ══════════════════════════════     │  ← Drag handle
│  🔌 Apps & Services verbinden   ✕   │  ← Header with close
├─────────────────────────────────────┤
│  🔍 [Apps suchen...]               │  ← Search input
│                                     │
│  [Alle] [Fitness] [Social] [...]   │  ← Category pills (horizontal scroll)
├─────────────────────────────────────┤
│                                     │
│  Apple Health     ✓ Verifiziert    │
│  🍎 Gesundheitsdaten synchron...   │
│                        [Verbinden] │
│                                     │
│  Google Fit       ✓ Verifiziert    │
│  🏃 Workouts, Ernährung...         │
│                        [Verbinden] │
│                                     │
│  Strava           ✓ Verifiziert    │
│  🚴 Laufen, Radfahren...           │
│                        [Verbinden] │
│                                     │
├─────────────────────────────────────┤
│  [Fertig]                          │
└─────────────────────────────────────┘
```

---

## Connect Flow Logic

```typescript
// In MobileConnectedAppsView.tsx
const handleConnect = (integration: Integration) => {
  // Close the detail sheet first
  setSelectedApp(null);
  
  // Check if it's a social platform
  const socialPlatforms = ['linkedin', 'instagram', 'tiktok', 'youtube', 'facebook', 'x'];
  
  if (socialPlatforms.includes(integration.id)) {
    // Open social media import dialog
    setSocialImportPlatform(integration.id);
    setSocialImportDialogOpen(true);
  } else {
    // For other apps, show placeholder toast
    toast({
      title: translate('connectedApps.actions.connect'),
      description: `${integration.name} connection coming soon`,
    });
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ConnectAppPopup.tsx` | Complete rewrite: add i18n, mobile Sheet, use integrationData |
| `src/components/settings/MobileIntegrationDetailSheet.tsx` | Add onConnect/onDisconnect props with handlers |
| `src/components/settings/MobileConnectedAppsView.tsx` | Add social import dialog state and connect handler |
| `src/i18n/de.json` | Add `connectedApps.popup` namespace (German) |
| `src/i18n/en.json` | Add `connectedApps.popup` namespace (English) |

---

## Implementation Sequence

1. **Add i18n keys** to both language files
2. **Refactor ConnectAppPopup** with mobile Sheet and translations
3. **Update MobileIntegrationDetailSheet** with action handlers
4. **Wire MobileConnectedAppsView** to handle connect actions and open SocialMediaImportDialog

---

## Result

After these changes:
- The "App hinzufügen" button opens a **native-feeling bottom sheet** on mobile
- All text displays in **German** when German is selected
- Clicking "Verbinden" on an unconnected app triggers the **appropriate connection flow**
- Social apps open the existing `SocialMediaImportDialog`
- Non-social apps show a toast placeholder for future OAuth implementation

