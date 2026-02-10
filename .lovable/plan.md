
# Autopilot: German Text Update + Working AI Profile Suggestions

## Overview

Two changes: (1) Update the German banner text, and (2) make the "Try/Ausprobieren" button actually generate and apply AI-powered profile suggestions via a new edge function.

## 1. German Translation Fix

**File: `src/i18n/de.json` (line 2026)**
- From: `"polishBio": "Bio, Archetyp & Highlights verbessern"`
- To: `"polishBio": "Bio, Profil & Highlights"`
- English stays unchanged.

## 2. New Edge Function: `supabase/functions/autopilot-profile/index.ts`

Creates a backend function that calls the Lovable AI Gateway to generate profile improvement suggestions.

- Receives: `currentBio`, `currentArchetype`, `selectedOptions` (which checkboxes the user picked)
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` using tool calling to extract structured output (suggested bio + archetype as JSON)
- Returns: `{ bio?: string, archetype?: string }`
- Handles 429/402 rate limit errors gracefully
- `verify_jwt = true` in `config.toml`

## 3. Translation Keys for the Preview Step

Add new keys under `autopilot.profilePopup` in both `en.json` and `de.json`:

| Key | English | German |
|-----|---------|--------|
| `generating` | Generating suggestions... | Vorschlaege werden erstellt... |
| `suggestedBio` | Suggested Bio | Vorgeschlagene Bio |
| `suggestedArchetype` | Suggested Archetype | Vorgeschlagener Archetyp |
| `currentValue` | Current | Aktuell |
| `accept` | Accept | Uebernehmen |
| `reject` | Discard | Verwerfen |
| `acceptAll` | Accept All | Alle uebernehmen |
| `applied` | Changes saved! | Aenderungen gespeichert! |
| `error` | Something went wrong | Etwas ist schiefgelaufen |

## 4. Refactor `AutopilotProfilePopup.tsx`

Transform from a stub into a two-step flow:

**Step 1 (Selection)** -- existing UI, unchanged. User picks which options to improve.

**Step 2 (Preview)** -- new. After clicking "Run Autopilot":
- Shows a loading spinner with translated "Generating suggestions..." text
- Calls the `autopilot-profile` edge function via `supabase.functions.invoke()`
- Displays side-by-side "current vs suggested" cards for bio and/or archetype
- Each suggestion has individual "Accept" / "Discard" buttons
- "Accept All" button at the bottom
- On accept: upserts to `profiles` table (`bio`, `longevity_archetype` columns) and calls `refreshProfile()` from ProfileProvider
- Shows success toast, then closes

**New props**: The component will receive the user's current profile data (bio, archetype) and a `refreshProfile` callback. These are passed from `EditProfilePage.tsx`.

## 5. Wire Up in `EditProfilePage.tsx`

- Pass `profile.bio`, `profile.longevityArchetype` (fetched from context), and `refreshProfile` as new props to `AutopilotProfilePopup`
- The component already receives `open` and `onOpenChange`

## Files Changed

| File | Action |
|------|--------|
| `src/i18n/de.json` | Edit line 2026 + add new keys at ~line 744 |
| `src/i18n/en.json` | Add new keys at ~line 744 |
| `supabase/functions/autopilot-profile/index.ts` | New file |
| `supabase/config.toml` | Add `[functions.autopilot-profile]` entry |
| `src/components/profile/AutopilotProfilePopup.tsx` | Major refactor: two-step flow with AI integration |
| `src/pages/EditProfilePage.tsx` | Pass profile data + refreshProfile to popup |
