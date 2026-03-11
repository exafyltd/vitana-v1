

# AI Data Consent Gate — Apple Guideline 5.1.1 Fix

## Problem
Apple rejected because the app sends personal data (voice, text, diary, memory context) to a third-party AI service (Google Gemini via Lovable AI Gateway) without explicit disclosure and consent.

## Solution
Add a one-time AI consent dialog that gates ALL AI data transmission. Store consent in `user_preferences` so it persists and can be managed in Settings > Privacy.

## Database Migration

Add `ai_data_consent_given` (boolean, default false) and `ai_data_consent_date` (timestamptz, nullable) columns to `user_preferences`.

```sql
ALTER TABLE user_preferences
  ADD COLUMN ai_data_consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_data_consent_date timestamptz;
```

## New Component: `AIDataConsentDialog`

**File:** `src/components/ai/AIDataConsentDialog.tsx`

A modal dialog shown before any AI interaction if `ai_data_consent_given` is false. Contents:

- **Title:** "AI Data Sharing Disclosure"
- **What data is sent:** Voice recordings/transcripts, text messages, diary entries, Memory Garden entries, wellness goals, profile context
- **Who receives it:** "Google (Gemini AI models) via Lovable AI Gateway" — named explicitly
- **Why:** To provide personalized AI assistant responses
- **Privacy note:** Data is transmitted securely, not stored by the AI provider beyond the session
- **Buttons:** "I Agree" (sets `ai_data_consent_given = true` + timestamp) / "Not Now" (closes dialog, AI features remain blocked)

## New Hook: `useAIConsent`

**File:** `src/hooks/useAIConsent.ts`

Reads `ai_data_consent_given` from `useUserPreferences`. Exposes:
- `hasConsent: boolean`
- `showConsentDialog: () => void` 
- `grantConsent: () => void` (updates DB)
- `revokeConsent: () => void` (updates DB, sets false)

## Integration Points — Gate AI calls

All four AI entry points get a consent check. If `hasConsent` is false, show the dialog instead of proceeding:

| Entry Point | File | Change |
|---|---|---|
| ORB voice overlay | `VitanaAudioOverlay.tsx` | Before `connect()`, check consent. If not granted, show dialog instead of connecting |
| Voice service | `aiVoiceService.ts` | Guard `sendVoiceMessage` — throw/return if no consent |
| Autopilot profile | `AutopilotProfilePopup.tsx` | Before invoking `autopilot-profile`, check consent |
| Proactive assistant | `useProactiveAssistant.ts` | Skip proactive messages if no consent |

## Settings > Privacy Integration

**File:** `src/pages/settings/Privacy.tsx`

Add a new card/section in the "Data Sharing" tab:

- **Title:** "AI Data Sharing"
- **Description:** Shows current consent status and date
- **Switch:** Toggle to revoke/re-grant consent
- **Detail text:** Same disclosure (what data, who receives it)

This lets users revisit and revoke consent at any time, satisfying Apple's requirement.

## Update `useUserPreferences` Interface

Add `ai_data_consent_given` and `ai_data_consent_date` to the `UserPreferences` TypeScript interface.

## Files Changed

| File | Change |
|---|---|
| **Migration** | Add 2 columns to `user_preferences` |
| `src/components/ai/AIDataConsentDialog.tsx` | New consent dialog component |
| `src/hooks/useAIConsent.ts` | New hook for consent state |
| `src/hooks/useUserPreferences.ts` | Add new fields to interface |
| `src/components/audio/VitanaAudioOverlay.tsx` | Gate ORB connection on consent |
| `src/services/aiVoiceService.ts` | Guard voice service |
| `src/components/profile/AutopilotProfilePopup.tsx` | Guard autopilot AI call |
| `src/hooks/useProactiveAssistant.ts` | Skip if no consent |
| `src/pages/settings/Privacy.tsx` | Add AI consent management section |

