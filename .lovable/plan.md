

## Fix Mobile Health Screen Internationalization (i18n)

### Problem

The mobile Health screen displays all text in English even when German is selected. The screenshot shows hardcoded English strings:

- "Your Health Snapshot"
- "Top 15%"
- "Improving" / "Declining" / "Stable"
- "Good" (tier badge)
- "Nutrition", "Exercise", "Sleep", "Hydration", "Mental" (pillar labels)
- "Priority Focus"
- "This area currently has the biggest impact..."
- "Autopilot Suggests"
- "Take Action"
- "Upload Blood Test", "Order Blood Test", "View Plans"

### Root Cause

The mobile health components use hardcoded English strings instead of the `useTranslation()` hook:

| Component | Hardcoded Strings |
|-----------|------------------|
| `MobileHealthSnapshot.tsx` | "Your Health Snapshot", pillar labels, trend labels, "Top X%" |
| `MobilePriorityFocus.tsx` | "Priority Focus", explanation text |
| `MobileAutopilotGuidance.tsx` | "Autopilot Suggests", "Take Action" |
| `MobileHealthActionStrip.tsx` | "Upload Blood Test", "Order Blood Test", "View Plans" |
| `Health.tsx` | Autopilot suggestions passed as props |

### Solution

1. Add missing translation keys to `de.json` and `en.json`
2. Update all 4 mobile health components to use `useTranslation()`
3. Update `Health.tsx` to pass translated strings as props

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Add missing keys: `healthSnapshot`, `topPercentile`, trend labels |
| `src/i18n/en.json` | Add same keys for English |
| `src/components/health/mobile/MobileHealthSnapshot.tsx` | Import `useTranslation`, replace hardcoded strings |
| `src/components/health/mobile/MobilePriorityFocus.tsx` | Import `useTranslation`, replace hardcoded strings |
| `src/components/health/mobile/MobileAutopilotGuidance.tsx` | Import `useTranslation`, replace hardcoded strings |
| `src/components/health/mobile/MobileHealthActionStrip.tsx` | Import `useTranslation`, replace hardcoded strings |
| `src/pages/Health.tsx` | Translate autopilot suggestions and priority focus explanation |

---

## Technical Details

### Translation Keys to Add

Add to `health` namespace in both `de.json` and `en.json`:

```json
{
  "health": {
    "healthSnapshot": "Dein Gesundheits-Überblick",  // DE
    "topPercentile": "Top {percent}%",
    "trend": {
      "improving": "Verbessernd",
      "declining": "Abnehmend", 
      "stable": "Stabil"
    },
    "priorityFocusExplanation": "Dieser Bereich hat derzeit den größten Einfluss auf Ihre langfristige Gesundheit.",
    "autopilotSuggests": "Autopilot empfiehlt",
    "suggestions": {
      "uploadBloodTestResults": "Bluttestergebnisse hochladen",
      "startFitnessChallenge": "30-Tage-Fitness-Challenge starten"
    }
  }
}
```

### Component Updates

**MobileHealthSnapshot.tsx:**
```tsx
import { useTranslation } from '@/hooks/useTranslation';

export function MobileHealthSnapshot({ ... }) {
  const { translate } = useTranslation();
  
  // Replace hardcoded labels
  const PILLAR_CONFIG = [
    { key: 'nutrition', label: translate('health.pillars.nutrition'), emoji: '🥗' },
    { key: 'exercise', label: translate('health.pillars.exercise'), emoji: '🏃' },
    // ...
  ];
  
  // Replace trend label
  const trendLabel = trend === 'up' 
    ? translate('health.trend.improving')
    : trend === 'down' 
    ? translate('health.trend.declining') 
    : translate('health.trend.stable');
  
  return (
    // ...
    <span>🧬 {translate('health.healthSnapshot')}</span>
    <span>{translate('health.topPercentile').replace('{percent}', vitanaPercentile.toString())}</span>
    <span>{tier.label}</span> // Use translated tier from vitanaIndex
    // ...
  );
}
```

**MobilePriorityFocus.tsx:**
```tsx
import { useTranslation } from '@/hooks/useTranslation';

export function MobilePriorityFocus({ pillarName, ... }) {
  const { translate } = useTranslation();
  
  return (
    // ...
    <span>{translate('health.priorityFocus')}</span>
    <p>{translate('health.priorityFocusExplanation')}</p>
    // ...
  );
}
```

**MobileAutopilotGuidance.tsx:**
```tsx
import { useTranslation } from '@/hooks/useTranslation';

export function MobileAutopilotGuidance({ suggestions, onTakeAction }) {
  const { translate } = useTranslation();
  
  return (
    // ...
    <span>{translate('health.autopilotSuggests')}</span>
    <Button>{translate('health.takeAction')}</Button>
    // ...
  );
}
```

**MobileHealthActionStrip.tsx:**
```tsx
import { useTranslation } from '@/hooks/useTranslation';

export function MobileHealthActionStrip({ ... }) {
  const { translate } = useTranslation();
  
  return (
    // ...
    <Button>{translate('health.uploadBloodTest')}</Button>
    <Button>{translate('health.orderBloodTest')}</Button>
    <Button>{translate('health.viewPlans')}</Button>
    // ...
  );
}
```

**Health.tsx - Translate suggestions:**
```tsx
const { translate } = useTranslation();

// Inside mobile render
<MobileAutopilotGuidance
  suggestions={[
    translate('health.suggestions.uploadBloodTestResults'),
    translate('health.suggestions.startFitnessChallenge')
  ]}
  onTakeAction={() => setHealthActionsOpen(true)}
/>

<MobilePriorityFocus
  pillarName={translate(`health.pillars.${weakestPillar[0]}`)}
  pillarScore={weakestPillar[1]}
  pillarEmoji={pillarLabels[weakestPillar[0]].emoji}
  explanation={translate('health.priorityFocusExplanation')}
/>
```

### Tier Label Translation

The `getVitanaIndexTier()` function returns English tier labels. Either:
1. Map the tier label to translation key: `translate(\`vitanaIndex.${tier.label.toLowerCase()}\`)`
2. Or update the function to return a key instead of a label

Using option 1 (simpler):
```tsx
// In MobileHealthSnapshot.tsx
const translatedTierLabel = translate(`vitanaIndex.${tier.label.toLowerCase()}`);
```

### Existing Keys Already Available

These keys already exist in `de.json`:
- `health.priorityFocus` → "Priorität heute"
- `health.autopilotGuidance` → "Autopilot-Empfehlungen"
- `health.takeAction` → "Aktion ausführen"
- `health.uploadBloodTest` → "Bluttest hochladen"
- `health.orderBloodTest` → "Bluttest bestellen"
- `health.viewPlans` → "Pläne anzeigen"
- `health.pillars.nutrition` → "Ernährung"
- `health.pillars.exercise` → "Bewegung"
- `health.pillars.sleep` → "Schlaf"
- `health.pillars.hydration` → "Hydration"
- `health.pillars.mental` → "Mental"
- `vitanaIndex.improving` → "Verbessernd"
- `vitanaIndex.good` → "Gut"

### Keys to Add

| Key | German | English |
|-----|--------|---------|
| `health.healthSnapshot` | Dein Gesundheits-Überblick | Your Health Snapshot |
| `health.topPercentile` | Top {percent}% | Top {percent}% |
| `health.trend.improving` | Verbessernd | Improving |
| `health.trend.declining` | Abnehmend | Declining |
| `health.trend.stable` | Stabil | Stable |
| `health.priorityFocusExplanation` | Dieser Bereich hat derzeit den größten Einfluss auf Ihre langfristige Gesundheit. | This area currently has the biggest impact on your long-term healthspan. |
| `health.autopilotSuggests` | Autopilot empfiehlt | Autopilot Suggests |
| `health.suggestions.uploadBloodTestResults` | Bluttestergebnisse hochladen | Upload blood test results |
| `health.suggestions.startFitnessChallenge` | 30-Tage-Fitness-Challenge starten | Start 30-Day Fitness Challenge |

