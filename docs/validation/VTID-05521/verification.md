# Verification — VTID-05521 (native-wave2-ai-pages-r2 / ai-assistants)

Native port of the AI assistant settings screen `/assistant` (web `src/pages/assistant/AIAssistant.tsx`,
mobile branch) with its five `?tab=` panels, and the `useAIAssistants` management flow — 6 parity
rows, 1 route file. Spec: vitana-platform `.kiro/specs/native-wave2-ai-pages-r2/` (plan block +
`tasks.md` `<!-- lane: ai-assistants -->` govern), read from the plan branch while plan PR #4634 is open.

**Not verified on staging:** device runtime (Maestro, simulators, screenshot parity, real audio
playback) is deferred to G1 (`next_actor: owner`), recorded in `staging-tests.json` and
`apps/mobile/maestro/ai-assistants/README.md`. Everything below ran offline; every call is asserted
as the built request against a mocked gateway / Supabase double and nothing reaches a network
(`tests/helpers/no-network`).

## What changed

| Area | Files |
|---|---|
| Route | `apps/mobile/app/(app)/assistant/index.tsx`; `src/navigation/resolve.ts` `NATIVE_ROUTES` + `/assistant` |
| Screen | `src/screens/ai-assistants/AssistantScreen.tsx` (title, tab strip, `tab` param, loading skeleton, `null` on a failed read) |
| Panels | `panels/VoiceSettingsPanel.tsx`, `AIModelSettingsPanel.tsx`, `AutopilotSettingsPanel.tsx`, `ProactiveTalkingPanel.tsx`, `VaeaConfigPanel.tsx`; `components.tsx` |
| Connect flow | `AIAssistantConnectSheet.tsx` (twin of `AIAssistantConnectModal.tsx`, phone sheet branch) |
| Data | `data/requests.ts` (pure request builders), `data/hooks.ts` — class-B web hooks re-implemented natively: `useUserPreferences` (`user_preferences` select / default-row insert / update, key `['user_preferences', …]`), `useAIProviders` / `useAIConnections` / `useConnectAIProvider` / `useVerifyAIProvider` / `useDisconnectAIProvider` (`/integrations/ai-assistants/*`, key `['ai-assistants', …]`), `useVaeaConfig` (`GET`/`PUT /vaea/config`), gateway speech (`POST /orb/tts`), the manual greeting (`generate-proactive-greeting` edge function) |
| Port | `src/ports/assistant.tsx` — kit `Label` + button foreground, the lucide glyphs, `expo-audio` playback (screens never import `@vitana/ui` / `expo-audio`) |
| i18n | `src/i18n/*/aiAssistantsNative.json` — 29 keys, DE first (du-form), mirrored to ar en es fr pl pt ru sr tr zh; existing `screens.assistant.*`, `screens.business.*`, `screens.common.*`, `spotlightTierB.ai.assistantTabAi`, `toasts.hooks.*` reused |
| Ledger | `apps/mobile/parity/ledger.json` — `ASSISTANT.OVERVIEW/AI/AUTOPILOT/PROACTIVE/REFERRALS/VOICE` `not_started` → `native` |
| Tests | `apps/mobile/tests/ai-assistants/**` (new; no shared test changed) |

No `@vitana/core` change (plan decision 2: every data path here is class B), so no closure
regeneration. No backend / gateway / migration, no web screen touched.

## Parity notes (mobile-web branch, 1:1)

- `tab` = `searchParams.get('tab') || 'voice'`; a tab press writes `?tab=` back; an unknown value
  shows no panel (web `TabsContent` behaviour). Tab labels are the mobile `md:hidden` ones.
- Header: the phone `StandardHeader` renders the title only (`StandardHeader.tsx:41-49`), so the
  emoji and the hard-coded description are not shown on native either.
- Loading keeps header + tab strip and swaps only the pane for a skeleton; a failed read (or no
  member) renders nothing (web `if (!isLoading && !preferences) return null`).
- Every control writes the web's `user_preferences` column (filtered on the member) and invalidates
  `['user_preferences']`; a write error shows `toasts.hooks.errorUpdatingPreferences`.
- `ASSISTANT.VOICE` is the voice SETTINGS panel, not the live ORB session (R0.3).
- No utility bar on this page on the phone web (the mobile branch is `StandardHeader` + `Tabs`);
  the shell's top bar / bottom nav come from N3. No purchase surface: iOS IAP gates untouched
  (`drawer.ts` not edited). No hosted external page (checkout / portal), so no return leg; the only
  external link is the provider's API-key page, opened with `Linking.openURL`.

## Documented deviations

- **Device voices.** The web voice select lists the browser's `speechSynthesis` voices. The app has
  no such list, so the select shows the web's "no voices available" item + hint (the state the web
  shows on a browser without voices) and "Refresh browser voices" re-reads the empty list.
- **Preview / sample-greeting fallback.** The web speaks through the gateway (`POST /orb/tts`) with
  AI consent and falls back to browser speech otherwise. The app has no browser speech, so without
  consent, or for a language the gateway cannot serve (Serbian), it shows the new
  `aiAssistantsNative.voice.previewUnavailable` toast instead.
- **Preview phrase** comes from the catalog in the selected `stt_language`
  (`aiAssistantsNative.voice.previewPhrase`), not a hard-coded per-language map (vitana-platform
  CLAUDE.md rules 41-42). The sample greeting is composed by the edge function, never in code.
- **Number / time fields** write only a whole number 1..20 / a valid `HH:MM` (the web inputs cannot
  hold anything else); **sliders** update the cached row optimistically so the thumb follows the
  drag, then the refetch is authoritative and an error rolls back.
- **Web English literals** ("AI", "Preview Voice"/"Playing...", "Play Sample Greeting"/"Speaking...",
  message-type labels, "Not set"/"None", VAEA switch descriptions, connect-modal messages) come from
  the catalog in all 11 locales; connect errors show the gateway code inside a catalog sentence.
- **Connect sheet entry point.** On the web the connect modal opens from Connected Apps
  (`MobileConnectedAppsView.tsx:539`), not from `/assistant` (`AIAssistant.tsx` imports no part of the
  `useAIAssistants` flow). Its native twin is the support-connectors lane's
  `src/screens/support/ConnectorsScreen.tsx`, outside this lane's paths, which still shows the
  placeholder for AI key paste (`ConnectorsScreen.tsx:181-183`). This lane ships the hooks and the
  sheet, tested; wiring the sheet into ConnectorsScreen is a follow-up for the connectors lane.

## Red → green

`red-on-base.txt`: the lane's tests on a clean `origin/main` (6b9137ac5) — 4 suites fail (modules
missing); a route probe fails (`/assistant` not in `NATIVE_ROUTES`, the 6 rows `not_started`). On the
branch all 132 pass, twice at default workers (`commands.log`).
