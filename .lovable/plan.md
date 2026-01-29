

# Fix Default Bio Translation - Merge Duplicate Profile Keys

## Root Cause

The translation files have **3 duplicate `"profile":` keys**:

| Location | Contents |
|----------|----------|
| Lines 598-649 | `title`, `editProfile`, `posts`, `media`, `groups`, etc. |
| Lines 651-653 | `defaultBio` only |
| Lines 1455-1465 | `autopilot`, `identity` |

In JSON, duplicate keys are overwritten - **only the last one (line 1455) is used**. Since that object doesn't contain `defaultBio`, the translation lookup always falls back to English.

## Solution

Merge all three `profile` objects into ONE at line 1455, combining all keys:

- `defaultBio` from lines 651-653
- `autopilot` and `identity` from lines 1455-1465
- Delete the orphaned `profile` blocks at lines 651-653

## Implementation

### Step 1: Update `src/i18n/de.json`

Merge `defaultBio` into the final `profile` object at line 1455:

```json
"profile": {
  "defaultBio": "Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱",
  "autopilot": {
    "polishBio": "Bio, Archetyp & Showcase verbessern",
    "try": "Ausprobieren"
  },
  "identity": {
    "vitanaIndex": "Vitana Index",
    "basedOnActivity": "Basierend auf Aktivität, Gesundheitsengagement & Beitrag",
    "viewLongevityId": "Meine Langlebigkeits-ID anzeigen"
  }
}
```

Then delete the orphaned block at lines 651-653.

### Step 2: Update `src/i18n/en.json`

Same approach - merge `defaultBio` into the final `profile` object:

```json
"profile": {
  "defaultBio": "Wellness enthusiast passionate about holistic health and community building. 🌱",
  "autopilot": {
    "polishBio": "Polish your bio, archetype & showcase",
    "try": "Try"
  },
  "identity": {
    "vitanaIndex": "Vitana Index",
    "basedOnActivity": "Based on activity, health engagement & contribution",
    "viewLongevityId": "View my Longevity ID"
  }
}
```

Then delete the orphaned block at lines 651-653.

## Files to Modify

| File | Change |
|------|--------|
| `src/i18n/de.json` | Merge `defaultBio` into final `profile` block, delete orphaned block |
| `src/i18n/en.json` | Merge `defaultBio` into final `profile` block, delete orphaned block |

## Expected Result

After fix:
- German selected: "Wellness-Enthusiast mit Leidenschaft für ganzheitliche Gesundheit und Gemeinschaftsaufbau. 🌱"
- English selected: "Wellness enthusiast passionate about holistic health and community building. 🌱"

## Acceptance Criteria

- [ ] `translate('profile.defaultBio')` returns German text when German is selected
- [ ] `translate('profile.defaultBio')` returns English text when English is selected
- [ ] No `[[missing:profile.defaultBio]]` appears in dev mode
- [ ] Publishing succeeds

