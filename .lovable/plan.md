

## Full Autopilot Internationalization (Option B)

### Summary
Fully localize all Autopilot UI components AND the mock action content so that when German is selected, all Autopilot text displays in German—including action titles, reasons, buttons, headers, and toasts.

---

### Root Cause
Multiple Autopilot components use hardcoded English strings instead of the `translate()` system:
- **AutopilotPopup.tsx** (utility bar popup): All UI chrome is hardcoded English
- **AutopilotProfilePopup.tsx** (profile polish popup): Title, option labels, descriptions, buttons all hardcoded
- **AutopilotSuggestions.tsx**: Some variants ('banner', 'showcase', 'archetype', 'profile-section') still use hardcoded strings
- **AutopilotWidget.tsx**: "Active", "Paused", "Do Now", and empty-state text hardcoded
- **AutopilotInsightBanner.tsx**: Headers, descriptions, and "Synergy Index" label hardcoded
- **use-autopilot.ts**: Mock action titles/reasons are in English

---

### Implementation Plan

#### Phase 1: Add Translation Keys to i18n Files

**File: `src/i18n/en.json`** — Extend existing `autopilot` namespace (do NOT create duplicate top-level key):

```json
"autopilot": {
  // ... existing keys ...
  "popup": {
    "title": "Autopilot Actions",
    "selectedOf": "{selected} of {total} selected",
    "readyToExecute": "Ready to execute {count} action(s) prepared by your AI assistant.",
    "executingTitle": "Executing Actions...",
    "executingDesc": "Please wait while AI handles your requests",
    "complete": "{percent}% complete",
    "go": "GO ({count})",
    "notNow": "Not Now",
    "seeOptions": "See Options",
    "seeAllInAI": "See All in AI Intelligence →",
    "moreActions": "+{count} more actions",
    "toastExecutedTitle": "Actions Executed",
    "toastExecutedDesc": "{success}/{total} actions completed successfully",
    "toastFailedTitle": "Execution Failed",
    "toastFailedDesc": "Something went wrong. Please try again."
  },
  "priorities": {
    "high": "High",
    "medium": "Medium",
    "low": "Low"
  },
  "widget": {
    "title": "Autopilot ⚡",
    "active": "Active",
    "paused": "Paused",
    "doNow": "Do Now",
    "allOptimized": "All optimized! 🎯",
    "enableToSee": "Enable Autopilot to see suggestions",
    "completeForRewards": "Complete autopilot suggestions for rewards",
    "enableForCredits": "Enable autopilot for credits"
  },
  "insightBanner": {
    "title": "Autopilot Health Overview",
    "description": "Your Vitana Autopilot analyzed current plans and consistency.",
    "synergyIndex": "Synergy Index",
    "statusBalanced": "Balanced",
    "statusNeedsAttention": "Needs Attention",
    "statusImproving": "Improving"
  },
  "profilePopup": {
    "title": "Let Autopilot polish your profile ✨",
    "polishBio": "Polish my Bio",
    "polishBioDesc": "Autopilot can rewrite About section to be more inspiring",
    "refreshArchetype": "Refresh my Archetype",
    "refreshArchetypeDesc": "Suggest Longevity Archetype update based on activity",
    "highlightShowcase": "Highlight my Showcase",
    "highlightShowcaseDesc": "Suggest top posts or media for featured content",
    "styleProfile": "Style my Profile",
    "styleProfileDesc": "Suggest improvements to cover photo, roles, profile picture",
    "cancel": "Cancel",
    "runAutopilot": "Run Autopilot"
  },
  "suggestions": {
    "bannerTitle": "Autopilot can help optimize your profile",
    "bannerDesc": "Get AI-powered suggestions to make your profile more engaging and complete.",
    "enable": "Enable",
    "showcaseTitle": "Autopilot Recommendations",
    "showcaseDesc": "Based on your activity, these posts might perform well as featured content:",
    "suggestPopular": "Suggest Popular Posts",
    "recentHighlights": "Recent Highlights",
    "archetypeTitle": "Archetype Insights",
    "archetypeDesc": "Your wellness activities suggest you might be \"The Mindful Mover\" - want to update?",
    "updateArchetype": "Update Archetype",
    "profileSectionTitle": "Autopilot can polish your profile ✨",
    "profileSectionDesc": "Get AI-powered suggestions for your bio, archetype, and showcase.",
    "tryAutopilot": "Try Autopilot"
  },
  "actions": {
    "action1Title": "Join Longevity Dance Group Tonight?",
    "action1Reason": "Perfect match for your movement goals + social wellness vibes",
    "action2Title": "AI Breakthrough Insight Just Dropped",
    "action2Reason": "Your digital twin discovered something fascinating from your patterns",
    "action3Title": "Hydration Streak at 5 Days — Legend Status Awaits",
    "action3Reason": "One more sip closer to your weekly hydration mastery",
    "action4Title": "Auto-invite Squad to Epic Weekend Meetup",
    "action4Reason": "Sarah, Luna & Marcus are perfect longevity tribe matches",
    "action5Title": "Your Biomarker Story Awaits",
    "action5Reason": "Dr. Chen decoded exciting insights from your latest panel",
    "action6Title": "Mindful Morning Magic",
    "action6Reason": "Your soul is calling for these stress-melting techniques",
    "newActionTitle": "New AI suggestion",
    "newActionReason": "Based on recent activity patterns"
  }
}
```

**File: `src/i18n/de.json`** — Same structure with German translations (formal "Sie"):

```json
"autopilot": {
  // ... existing keys ...
  "popup": {
    "title": "Autopilot-Aktionen",
    "selectedOf": "{selected} von {total} ausgewählt",
    "readyToExecute": "Bereit, {count} Aktion(en) auszuführen, die Ihr KI-Assistent vorbereitet hat.",
    "executingTitle": "Aktionen werden ausgeführt...",
    "executingDesc": "Bitte warten Sie, während die KI Ihre Anfragen bearbeitet",
    "complete": "{percent}% abgeschlossen",
    "go": "LOS ({count})",
    "notNow": "Nicht jetzt",
    "seeOptions": "Optionen anzeigen",
    "seeAllInAI": "Alle in KI-Intelligenz anzeigen →",
    "moreActions": "+{count} weitere Aktionen",
    "toastExecutedTitle": "Aktionen ausgeführt",
    "toastExecutedDesc": "{success}/{total} Aktionen erfolgreich abgeschlossen",
    "toastFailedTitle": "Ausführung fehlgeschlagen",
    "toastFailedDesc": "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut."
  },
  "priorities": {
    "high": "Hoch",
    "medium": "Mittel",
    "low": "Niedrig"
  },
  "widget": {
    "title": "Autopilot ⚡",
    "active": "Aktiv",
    "paused": "Pausiert",
    "doNow": "Jetzt ausführen",
    "allOptimized": "Alles optimiert! 🎯",
    "enableToSee": "Aktivieren Sie Autopilot, um Vorschläge zu sehen",
    "completeForRewards": "Autopilot-Vorschläge abschließen für Belohnungen",
    "enableForCredits": "Autopilot aktivieren für Credits"
  },
  "insightBanner": {
    "title": "Autopilot-Gesundheitsübersicht",
    "description": "Ihr Vitana Autopilot hat aktuelle Pläne und Konsistenz analysiert.",
    "synergyIndex": "Synergie-Index",
    "statusBalanced": "Ausgewogen",
    "statusNeedsAttention": "Aufmerksamkeit erforderlich",
    "statusImproving": "Verbesserung"
  },
  "profilePopup": {
    "title": "Lassen Sie Autopilot Ihr Profil aufpolieren ✨",
    "polishBio": "Meine Biografie aufpolieren",
    "polishBioDesc": "Autopilot kann den Über-Bereich inspirierender gestalten",
    "refreshArchetype": "Meinen Archetyp aktualisieren",
    "refreshArchetypeDesc": "Archetyp-Aktualisierung basierend auf Aktivität vorschlagen",
    "highlightShowcase": "Mein Showcase hervorheben",
    "highlightShowcaseDesc": "Top-Beiträge oder Medien für Featured-Inhalte vorschlagen",
    "styleProfile": "Mein Profil gestalten",
    "styleProfileDesc": "Verbesserungen für Titelbild, Rollen und Profilbild vorschlagen",
    "cancel": "Abbrechen",
    "runAutopilot": "Autopilot starten"
  },
  "suggestions": {
    "bannerTitle": "Autopilot kann Ihr Profil optimieren",
    "bannerDesc": "Erhalten Sie KI-gestützte Vorschläge, um Ihr Profil ansprechender zu gestalten.",
    "enable": "Aktivieren",
    "showcaseTitle": "Autopilot-Empfehlungen",
    "showcaseDesc": "Basierend auf Ihrer Aktivität könnten diese Beiträge gut als Featured-Inhalte funktionieren:",
    "suggestPopular": "Beliebte Beiträge vorschlagen",
    "recentHighlights": "Aktuelle Highlights",
    "archetypeTitle": "Archetyp-Einblicke",
    "archetypeDesc": "Ihre Wellness-Aktivitäten deuten darauf hin, dass Sie \"The Mindful Mover\" sein könnten - möchten Sie aktualisieren?",
    "updateArchetype": "Archetyp aktualisieren",
    "profileSectionTitle": "Autopilot kann Ihr Profil aufpolieren ✨",
    "profileSectionDesc": "Erhalten Sie KI-gestützte Vorschläge für Ihre Biografie, Ihren Archetyp und Ihr Showcase.",
    "tryAutopilot": "Autopilot testen"
  },
  "actions": {
    "action1Title": "Heute Abend der Langlebigkeits-Tanzgruppe beitreten?",
    "action1Reason": "Perfekt passend zu Ihren Bewegungszielen + soziales Wellness-Gefühl",
    "action2Title": "Neuer KI-Durchbruch entdeckt",
    "action2Reason": "Ihr digitaler Zwilling hat etwas Faszinierendes in Ihren Mustern entdeckt",
    "action3Title": "Hydrationssträhne bei 5 Tagen — Legendenstatus wartet",
    "action3Reason": "Noch ein Schluck näher an Ihrer wöchentlichen Hydrationsmeisterschaft",
    "action4Title": "Squad zum epischen Wochenend-Meetup automatisch einladen",
    "action4Reason": "Sarah, Luna & Marcus sind perfekte Langlebigkeits-Tribe-Matches",
    "action5Title": "Ihre Biomarker-Geschichte wartet",
    "action5Reason": "Dr. Chen hat spannende Erkenntnisse aus Ihrem letzten Panel entschlüsselt",
    "action6Title": "Achtsamer Morgen-Zauber",
    "action6Reason": "Ihre Seele ruft nach diesen stressschmelzenden Techniken",
    "newActionTitle": "Neuer KI-Vorschlag",
    "newActionReason": "Basierend auf aktuellen Aktivitätsmustern"
  }
}
```

---

#### Phase 2: Update Components

**1. AutopilotPopup.tsx** (utility bar popup)
- Import `useTranslation`
- Replace all hardcoded strings with `translate('autopilot.popup.*')` calls
- Use manual interpolation pattern: `.replace('{key}', value)`
- Replace priority labels with `translate('autopilot.priorities.*')`

**2. AutopilotProfilePopup.tsx** (profile polish dialog)
- Import `useTranslation`
- Replace `suggestions` array with dynamic translation lookups:
  - Keep stable IDs (`polish-bio`, etc.)
  - Use `translate('autopilot.profilePopup.*')` for titles/descriptions
- Translate buttons: Cancel, Run Autopilot
- Translate dialog title

**3. AutopilotSuggestions.tsx**
- Already has `useTranslation` imported
- Replace remaining hardcoded strings in 'banner', 'showcase', 'archetype', 'profile-section' variants with `translate('autopilot.suggestions.*')` calls

**4. AutopilotWidget.tsx**
- Import `useTranslation`
- Replace "Active"/"Paused" with `translate('autopilot.widget.active/paused')`
- Replace "Do Now" with `translate('autopilot.widget.doNow')`
- Replace empty-state text with translated strings
- Replace RewardDot descriptions with translated strings

**5. AutopilotInsightBanner.tsx**
- Import `useTranslation`
- Replace "Autopilot Health Overview" and description with translated strings
- Replace "Synergy Index" with translated string
- Translate status labels (balanced, needs-attention, improving)

**6. use-autopilot.ts** (mock action data)
- Import `useTranslation` hook
- Create a `getLocalizedActions()` helper that returns mock actions with:
  - `title`: `translate('autopilot.actions.action{n}Title')`
  - `reason`: `translate('autopilot.actions.action{n}Reason')`
- Keep IDs stable for logging/tracking

---

#### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/en.json` | Add `autopilot.popup.*`, `autopilot.priorities.*`, `autopilot.widget.*`, `autopilot.insightBanner.*`, `autopilot.profilePopup.*`, `autopilot.suggestions.*`, `autopilot.actions.*` keys |
| `src/i18n/de.json` | Same structure with German translations |
| `src/components/AutopilotPopup.tsx` | Use `translate()` for all UI text |
| `src/components/profile/AutopilotProfilePopup.tsx` | Use `translate()` for title, options, buttons |
| `src/components/profile/AutopilotSuggestions.tsx` | Use `translate()` for remaining hardcoded variants |
| `src/components/health/AutopilotWidget.tsx` | Use `translate()` for status/buttons/empty-state |
| `src/components/health/AutopilotInsightBanner.tsx` | Use `translate()` for headers/descriptions |
| `src/hooks/use-autopilot.ts` | Localize mock action titles/reasons |

---

#### Technical Details

**Interpolation Pattern** (consistent with existing codebase):
```typescript
translate('autopilot.popup.selectedOf')
  .replace('{selected}', String(selectedActions.length))
  .replace('{total}', String(pendingActions.length))
```

**Stable ID Mapping for Profile Options**:
```typescript
const getSuggestionOptions = () => [
  {
    id: "polish-bio",  // stable internal ID
    title: translate('autopilot.profilePopup.polishBio'),
    description: translate('autopilot.profilePopup.polishBioDesc'),
    icon: User,
  },
  // ...
];
```

**Priority Translation Pattern**:
```typescript
<span className="ml-1 capitalize">
  {translate(`autopilot.priorities.${action.priority}`)}
</span>
```

---

#### Verification Steps
1. Set language to German in app settings
2. Open Autopilot from mobile utility bar → All popup text should be German
3. Navigate to /me/profile → Open "Try Autopilot" popup → All text German
4. Check Health Autopilot widgets → Labels in German
5. Switch back to English → Everything should flip back cleanly

