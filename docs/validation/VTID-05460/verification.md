# Verification — VTID-05460 (native-wave2-journey-autopilot-r2 / autopilot-audiobook)

Native Wave 2 autopilot-audiobook lane: the `/autopilot/audiobook` push deep link, the
app-wide native Audiobook player, its mini player and the daily-reminder control. Stacked
on the `journey` lane (VTID-05461, PR #1565, head `ea78f0835`): this branch is based on
`origin/kiro/native-wave2-journey-autopilot-r2/journey` and lands after #1565. All commands
run offline (the native app has no production profile; `assertNotProduction()` refuses
prod/staging hosts). Every command and its counts: `commands.log`. Red on base:
`red-on-base.txt`. Not verified on staging: device runtime (and audio playback) is deferred
to G1.

## What was built

| Web (mobile branch) | Native |
|---|---|
| `src/context/AudiobookPlayerProvider.tsx` (528, class-B: `communityFetch` :33) | `src/screens/audiobook/AudiobookPlayerProvider.tsx`, re-implemented (not extracted). Same API (`active, playing, loading, error, track, position, duration, rate, sleepMinutes, episodeSummary, finished, start, toggle, next, previous, cycleRate, cycleSleep, askVitana, dismissSummary, retry, close`). `start()` loads `GET /journey-checklist?locale=` and `GET /journey/state` through the same React Query keys and query functions My Journey uses (journey lane, via the dashboard port), builds the queue with the core rules (`@vitana/core/audiobook-queue`: `buildAudiobookQueue`, `groupTopicsBySession`, `findStartIndex`, `previousIndex`, `nextRate`, `nextSleepTimer`), starts at topic / episode / first unheard episode and resumes the per-device position (key-value store, same keys `vitana.audiobook.position.v1.<user>`, `vitana.audiobook.rate.v1`). Each topic: `GET /api/v1/journey/audiobook/topics/:id/audio?lang=<member language>` with Bearer + `X-Vitana-Active-Role: community`. End of topic: optimistic journey-state cache + `POST /journey/session-listened {session, topicId, localDate}` + refetch; last topic of an episode → summary card; last topic overall → finished. Sleep timer, speed (stored), previous (restart after 3 s), next, Ask Vitana (pause + ORB with the topic id through the journey ORB bridge), close, retry, sign-out stops playback. |
| `<audio>` element + blob URL (:162-198) | `expo-audio` behind `src/ports/audiobook.tsx`. A native player cannot play a blob URL, so it streams the same URL with the same headers (`audiobookStreamSource`, built by N1's `createGatewayFetch` with a capturing transport). The web's status rule (404 / 422 → "unavailable", other → "network") is kept: when the player reports an error, the provider makes the web's GET once (`communityFetch`, same path) and reads the status. `prefetchNext` → `expo-audio` `preload` (bounded at 3, as `BLOB_CACHE_MAX`). |
| Media Session (:441-475) | `setActiveForLockScreen(true, {title, artist: 'Vitana', albumTitle: screens.audiobook.albumTitle})` with seek back / forward; cleared on close. |
| `src/lib/audiobook/unlock.ts` (iOS Safari gesture unlock) | Not needed on native (no autoplay gate); `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' })` instead (plays through the silent switch; `doNotMix` is what expo-audio needs for lock-screen controls). |
| `src/lib/audiobook/events.ts` (`vitana:audiobook` window event) | `src/screens/audiobook/events.ts`: the same event name and `{name, props, at}` detail on the overlay bus (`play_started`, `track_started`, `track_completed`, `episode_completed`, `audiobook_finished`, `ask_vitana`, `try_it_now`). |
| `src/components/audiobook/AudiobookMiniPlayer.tsx` (259), mounted app-wide (App.tsx:809-810) | `AudiobookMiniPlayer.tsx`, mounted once by `AudiobookHost` around the router in `app/_layout.tsx` (inside the ORB provider), floating `safe-area + 88` above the bottom bar, inset 12, rounded 24, `category-2/15` border, card at 95 %, the 2xl shadow. Sections in the web order: end-of-episode card (gradient `category-2/10 → category-4/10`, ✨, "Episode N done", reward line, "Try it now", dismiss) · gradient 🎧 badge (`category-4 → category-2`), "Episode N" eyebrow (uppercase), title / finished / loading, close · progress bar (role progressbar, value 0-100, width animates 150 ms) · error line with "Ask Vitana" (unavailable) or "Retry" (network), or the five controls (speed `1.25×`, previous, play/pause 56 px with the spinning loader, next, sleep timer with `15′`) · "Ask Vitana". "Try it now" runs `practiceTargetAction` (route through the one navigator, overlay event on the bus, or the ORB). Previous / play / next mirror in RTL (web `rtl:-scale-x-100`). Reduced motion stops the spinner and the width transition. |
| `src/components/audiobook/AudiobookReminderControl.tsx` (97), AutopilotDashboard.tsx:435 | `AudiobookReminderControl.tsx`, provided into the journey lane's typed slot `JourneySlotsContext.AudiobookReminderControl` by the player provider (no journey file edited), so My Journey draws it between "how it works" and the catalog. 🔔, title, body, the kit Select (off + 07:00 / 08:00 / 12:00 / 18:00 / 20:00 / 21:00). Save: `POST /api/v1/journey/audiobook/reminder {time, tz}` / `{time: null}`, toasts `reminderSaved {time}` / `reminderOff` / `reminderError`, refetches the journey state; disabled while saving or signed out. |
| `useAudiobookPlayer()` in My Journey (hero "Play episode N" :306-311, the catalog's session play, the card strip) | The provider also fills the journey lane's `JourneyAudiobookContext` (`{active, start}`), so those callers take the web's player branch instead of the ORB fallback. |
| `/autopilot/audiobook` (App.tsx:1544-1548) + AutopilotDashboard.tsx:167-189 | `app/(app)/autopilot/audiobook.tsx` → `AudiobookDeepLinkScreen`: renders `JourneyScreen` through the dashboard port (`src/ports/journey-dashboard.ts`, no duplicate dashboard) and, once the member is known, switches to Guided (`setMode('guided')` of the journey's own provider: cache + `POST /journey/mode`), starts the player unless it is active, and replaces the route with `/autopilot`. `/autopilot?audiobook=play` (the welcome's "Play Episode 1") is watched next to the player and sent through the same deep link. `resolve.ts` lists the route (cold start: a push `data.url` resolves `native`). |
| Ledger | `/autopilot/audiobook` → `native` (owner kiro, 2026-11-02); `--sync` changed nothing else. |
| i18n | Every string from the web catalog (`screens.audiobook.*`, 30 keys, all 11 locales). New native-only keys (DE first, then the other ten): `journeyAutopilotNative.audiobook.rateValue` (`{rate}×`) and `.sleepShort` (`{min}′`), the web's inline literals, now formatted with the locale's number format (German `1,25×`). |

## Kept out, with proof

- The desktop placement (`md:inset-x-auto md:end-6 md:bottom-6 md:w-[400px]`,
  AudiobookMiniPlayer.tsx:89) and the desktop Audiobook sections (AutopilotDashboard.tsx:525,
  :593): `md:` / the non-mobile branch; native is always the mobile branch.
- The audio "unlock" silence (unlock.ts): a Safari gesture rule; native players have no
  autoplay gate. The web's "autoplay blocked → stay paused" branch (:236-238) cannot occur.

## Deviations (needs owner / another lane)

- **Root layout mount (plan gap).** tasks.md task 2 mounts the mini player app-wide "the same
  way the web mini-player is (web src/App.tsx:810)". The only place above the router is
  `apps/mobile/app/_layout.tsx`, which is not in this lane's `paths`. Changed: one import +
  `<AudiobookHost>` around `<Stack />` inside `<OrbProvider>`. Lane scope may flag it.
- **Journey route test.** `apps/mobile/tests/journey/core-i18n-route.test.tsx` asserted
  `/autopilot/audiobook` is `unported` ("stays the sibling lane's row"). This lane flips that
  row, so the assertion now expects `native`. No other journey file is touched.
- **Reminder value (journey lane follow-up).** The web reads `state.audiobookReminder.time`
  from `fetchJourneyState` (web useGuidedJourneyProgress.ts:45, :261). The journey lane's
  native `fetchJourneyState` (apps/mobile/src/screens/journey/hooks/useGuidedJourneyProgress.ts:131-155)
  declares the field but does not parse it. Without editing that file, the control reads
  `GET /journey/state` under a child key `['journey','state','audiobookReminder']`, so every
  journey-state invalidation refreshes it too. Cost: one extra GET when the Guided view opens.
  Follow-up for the journey lane: add `audiobookReminder: parseReminder(s.audiobookReminder)`,
  then the control can use the shared key.

## Follow-ups (not in this lane)

- **Background audio (owner, ORB F9 rule).** The web keeps playing in the background and on
  the lock screen. `app.config.ts:87-100` sets `enableBackgroundPlayback: false` on purpose
  ("No background audio (the ORB's F9 rule)"), asserted by `tests/diary/app-config-plugins.test.ts:56`.
  Native plays while the app is in the foreground (across every screen) and shows the
  lock-screen metadata; playback stops when the app goes to the background. Turning it on is
  an owner decision (app config + UIBackgroundModes `audio`).
- **Lock-screen next / previous.** The web registers `nexttrack` / `previoustrack` Media
  Session handlers (:456-457); `expo-audio` 57 lock-screen options offer only seek back /
  forward (`AudioLockScreenOptions`), so next / previous are in-app only.
- **ORB lane (no change to `apps/mobile/src/orb/**`).** (1) The web ORB front door skips its
  auto-open while the mini player is on screen or on `?audiobook=play`
  (src/hooks/useOrbFrontDoor.ts:31-33, :94-100); a native front door, when the ORB lane adds
  one, should read `useAudiobookPlayer()?.active`. (2) "Ask Vitana" opens the ORB with the
  topic id through the journey lane's `JourneyOrbBridgeContext`; until the ORB lane provides
  `focusGuidedTopic`, Vitana opens as a normal conversation (journey verification.md
  follow-up, same files: protocol.ts:239, session.ts:355-358, orb-controller.ts:72).
- **Product analytics.** The web also forwards each Audiobook event to
  `src/lib/product-analytics/client.ts` (`audiobook_<name>`). The native app has no
  product-analytics client yet; the bus event carries the same name and properties for it.
- **Frosted glass.** The web card uses `backdrop-blur-md` (AudiobookMiniPlayer.tsx:90). The
  app has no blur module (`expo-blur` is not a dependency; adding one is outside the lane
  paths); the card keeps the web's 95 % card colour, so the visible difference is the blur of
  the content behind it.
- **Other web callers of the player** on other lanes' screens: Home `LongevityJourneyCard`
  (src/components/home/LongevityJourneyCard.tsx:36) and the onboarding welcome
  (src/pages/onboarding/OnboardingWelcome.tsx:33). They can call `useAudiobookPlayer()` from
  `src/screens/audiobook/AudiobookPlayerProvider.tsx` once those lanes port them.

## Checks (counts in commands.log)

`npm run typecheck` 0 errors; `npx jest tests/audiobook` 3 suites / 57 tests; the journey
suites (3 / 97) green with the updated route assertion; full `npm test` (see commands.log);
`APP_PROFILE=development npm run bundle` iOS + Android; `deps:check` up to date;
`parity:check` OK (34 native routes); `core-closure --check` and `gen-core-extract --check`
up to date (no core change); root i18n checks, eslint on the lane files.

## Deferred to G1 (`next_actor: owner`)

Maestro `apps/mobile/maestro/audiobook/*` (README), iOS simulator / Android emulator
screenshots, screenshot parity vs the 390×844 read-only staging web, and audio playback on a
device / simulator with an audio route — `staging-tests.json`.
