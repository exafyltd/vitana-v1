
# Fix: Update German Tagline

## Change Required

Update the German tagline in the intro/landing screen from:
- **Current**: "Deine Langlebigkeitsreise, begleitet."
- **New**: "Deine Langlebigkeitsreise"

## File to Modify

**`src/i18n/de.json`** (line 581)

```json
// Before
"tagline": "Deine Langlebigkeitsreise, begleitet.",

// After
"tagline": "Deine Langlebigkeitsreise"
```

## Impact

This change affects the Maxina intro/welcome screen where the tagline appears below the tenant name.
