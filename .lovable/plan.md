

# Update German translation for Bio optimization option

## What to change
Two strings in `src/i18n/de.json` at lines 746-747:

- `polishBio`: "Meine Bio optimieren" → **"Optimieren Sie ihr Profil"**
- `polishBioDesc`: "Autopilot kann den Über-Bereich inspirierender gestalten" → **"Der Autopilot kann den Abschnitt „Über mich" umschreiben, damit er inspirierender wird."**

## Files
- `src/i18n/de.json` (2 string replacements)

No component changes needed — the popup already uses `translate()` for these keys.

