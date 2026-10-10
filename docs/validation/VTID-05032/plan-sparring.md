# Plan sparring record — VTID-05032 (Health Hub WP4a / D3 + D4)

- **Parent program:** VTID-05020 (Health Hub plan r7, §1 D3 + D4, §5 Phase 0).
- **Sparring session:** `plan_sparring_sessions.id = 1b29801e-570e-4099-b6a5-4d7fe75aeaad`. The VTID was allocated with `p_sparring_id`.
- **Partner:** `plan-sparring-partner` agent (read-only, independent). **Rounds:** 2. **Verdict:** CONVERGED.
- **Plan hashes:** round 1 `e31b066265c146e99c51eac8ae69052b0543f7ba7e3bc962cb260fc4964ca132`, **final `4f05fcc897a36e6ab2d71740b53b1a4a3b333aab1a721da3db701d926a2a0284`**.
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-10 — "Yes to both plans" (Gate 1 approval of the Health Hub program plan, VTID-05020; D3 and D4 are in it).

## Round 1 — NOT CONVERGED

| # | Sev | Finding | Answer |
|---|-----|---------|--------|
| F1 | major | Mobile (`MobileConnectedAppsView` + `integrationData.ts`) has its own parallel fake connection data. | Accepted: the mobile lists are merged with the gateway state (change 3). |
| F2 | major | The labels must come from `t()`, not new raw strings. | Accepted: only existing keys are reused; no new string. |
| F3 | minor | Remaining raw English outside the health cards. | Accepted as a follow-up recorded in STATUS.md (outside the health program). |
| F4 | minor | The source scan must catch string-literal `lastSync`/`newData` values. | Accepted: test added. |
| F5 | minor | Observability: a failed gateway call must not look like "nothing connected". | Accepted: the hook warns; the staging spec checks the providers endpoint answers. |
| F6 | minor | Regenerate `docs/SCREEN_INVENTORY.md`. | Accepted. |

## Round 2 — CONVERGED

| # | Sev | Finding | Answer |
|---|-----|---------|--------|
| F7 | minor | `ConnectAppPopup` marks apps connected too. | Accepted: it uses the same `connectedProvider()` merge. |
| F8 | minor | Scope the `connected: true` scan; shopping lists hold real affiliate state. | Accepted: scan scoped. |

## Implementation decisions (recorded for Gate 2)

- The existing `nameIntegrationComingSoon` copy in en, pt and sr was missing the space after `{name}` ("Apple Healthintegration").
  The health cards now show it, so the space was added. No key was added and no other locale changed.
- Sleep and nutrition cards that said "Coming Soon" now show the existing `notConnected` badge, with the coming-soon text in the card. Only the four named keys are reused.

## Final plan

<!-- plan:begin -->

## Meta
- **Change class:** standard. Frontend only (vitana-v1). No backend, no migration, no new route, no new screen.
- **Scope:** `src/pages/settings/ConnectedApps.tsx` (desktop), `src/components/settings/integrationData.ts` and
  `src/components/settings/MobileConnectedAppsView.tsx` (mobile, round-1 F1), `src/pages/settings/Privacy.tsx`, a new hook
  `src/hooks/useWearableProviders.ts`, `src/i18n/<11 locales>/screens.json` (only if a new key is unavoidable), a
  Vitest test, a staging Playwright spec, the evidence pack and the regenerated `docs/SCREEN_INVENTORY.md`.
- No What's New entry: this is a fix, not a new feature (CLAUDE.md VTID-04733).

## Facts (vitana-v1 origin/main 51a2058; vitana-platform origin/main 6c275e7)
1. `ConnectedApps.tsx` renders hard-coded health integrations as connected, with invented "last sync" times:
   - Health & Fitness `getHealthFitnessCards` (L365-452): Apple Health, Fitbit, MyFitnessPal `connected: true`,
     `lastSync: '2 minutes ago'` and similar.
   - Sleep & Recovery `getSleepRecoveryCards` (L455-): Oura `connected: true`.
   - Nutrition `getNutritionCards` (L520-): one `connected: true`.
   - Per-app sync `getPerAppSyncCards` (L1565-): six apps `connected: true`, "Synced" badges.
   - Their actions are `console.log` only (e.g. L433, L1626-1628). Nothing calls the gateway: grep of `src/` finds no
     `/api/v1/wearables` reference.
   - These sections render at L1929, L1947, L1965 and L2324.
2. The gateway already serves the real state: `GET /api/v1/wearables/providers` (`routes/wearables.ts` L61-106).
   - It returns the connector registry plus the signed-in member's active connections, with
     `status: 'connected' | 'available'` and `last_sync_at`.
   - It works signed out too (catalog only).
3. `Privacy.tsx` has uncontrolled switches with no handler:
   - "Health data analytics" (`<Switch defaultChecked />`, L282) and "Community insights" (`defaultChecked`, L289)
     show health-data sharing as ON although nothing records consent.
   - "Third-party integrations" (L296) is unchecked but equally inert.
   - "Request data export" (L374) has no handler.
4. The pattern for gateway calls with the member's token already exists in `src/hooks/useAIAssistants.ts`
   (`GATEWAY_BASE` normalisation and `authHeaders()` from the Supabase session, TanStack Query).
5. **Mobile has its own parallel fake data (round-1 F1).**
   - `src/components/settings/integrationData.ts` L183-236: `fitnessIntegrations` lists Apple Health, Fitbit, Oura
     and MyFitnessPal as `connected: true`, with `lastSync` values such as `'2 min ago'`.
   - `MobileConnectedAppsView.tsx` renders it (L26, L232-233). Its header count `getConnectionStats()` (L182) is
     computed from the same static data.
   - The "Data Sync" tab of `ConnectedApps.tsx` is fabricated end to end: `getSyncOverviewCard`, `getPerAppSyncCards`
     L1565-, and `getSyncHistoryCard` with invented entries such as "10:42 AM today: Fitbit synced steps".
6. **i18n:**
   - Every user-visible string must come from `src/i18n`.
   - `scripts/i18n-parity-gate.mjs` requires every DE key in all 11 GA locales, with nothing left
     `_pending_review`.
   - Existing reusable keys: `screens.settings.notConnected` ("Nicht verbunden"),
     `screens.settings.nameIntegrationComingSoon` ("{name}-Integration kommt bald."), plus the strings these cards
     already use (`dataSyncing`, `lastSyncLastsync`, `disconnect`, …).

## Changes
1. **`useWearableProviders()` hook.** TanStack Query `GET {GATEWAY_BASE}/api/v1/wearables/providers` with
   `authHeaders()`, following `useAIAssistants.ts`. Read-only. On error the hook returns an empty list, so nothing
   shows as connected.
2. **Health & Fitness cards from real data.**
   - A card's connected state, badge and expanded "last sync" come only from the provider whose `status` is
     `'connected'`. `last_sync_at` is rendered with `fmtDateTime`; no hard-coded relative times.
   - Apps with no gateway connector (Apple Health, MyFitnessPal, Garmin) show `notConnected` and a **disabled**
     action, with the existing `nameIntegrationComingSoon` text in place of the connect prompt. Apple Health and
     Health Connect arrive with the native app (VTID-05021).
   - Fitbit, Oura and Strava take their state from the provider list.
   - The member-initiated connect and disconnect buttons stay out of scope (no new write path in this WP). Their
     `console.log` actions become **disabled**, so nothing pretends to work.
3. **Mobile (round-1 F1).**
   - `integrationData.ts` keeps only the static catalog for health/fitness entries: `connected: false`, no
     `lastSync`.
   - `MobileConnectedAppsView` merges each entry with `useWearableProviders()` exactly as desktop does, through the
     shared `connectedProvider()`.
   - `getConnectionStats()` counts from the merged list, so the header never counts a fake connection.
   - `src/components/ConnectAppPopup.tsx` (imports the same lists, L13-14, shows a checkmark for `.connected`, L103/
     L122-125) marks an app connected through the same `connectedProvider()` (round-2 F7).
4. **Data Sync tab (planner finding).**
   - The overview counts only real connected providers.
   - The history card shows one row per real connected provider at its real `last_sync_at`.
   - The invented history entries are removed. With nothing connected, the tab shows `notConnected`.
5. **Sleep & Recovery, Nutrition, per-app sync.** Every hard-coded `connected: true` and invented `lastSync` is
   removed: Oura and the others read from the same provider list.
   - The per-app sync list shows only providers that are really connected.
   - With none connected, it shows the existing `notConnected` text instead of six fake "Synced" rows.
6. **Labels (round-1 F2).**
   - Every badge and action label on the health cards this WP touches (Health & Fitness, Sleep & Recovery,
     Nutrition, the Data Sync tab, mobile fitness/health) uses `t()` with the existing keys
     `screens.settings.connected`, `connect`, `settings` and `notConnected`. Status comes from the gateway.
   - No new raw English string is added.
   - The ~50 pre-existing raw English labels on the **non-health** cards (smart home, payments, developer tools …)
     and Privacy.tsx's raw English `subtitle` props are pre-existing i18n debt and out of scope. They are recorded in
     STATUS.md as a follow-up (round-1 F2/F3).
7. **Privacy switches (D4).** The three data-sharing switches become controlled, **off**, and **disabled**, with no
   `defaultChecked`. The "Request data export" button becomes disabled.
   - Reason: no consent record or export job exists yet. Wiring them is a later WP (D10 consents, export job).
   - No new string is added: a disabled control needs none (round-1 F2), so the i18n parity gate is unaffected.
8. **Observability (round-1 F5).** The hook `console.warn`s on any non-OK or failed gateway call before falling back
   to an empty list.
9. **No new route, no write.** Nothing in this WP calls a non-GET endpoint.

## Tests
- Vitest (`src/pages/settings/__tests__/connected-apps-health.test.tsx`), mocking the hook:
  - with `[]` providers, no health card shows "Connected"/"Synced" and the per-app sync list shows the empty text;
  - with Fitbit `status: 'connected'` and `last_sync_at` set, exactly that card is connected and shows the formatted
    time;
  - a source scan over `ConnectedApps.tsx` and `integrationData.ts` finds no `lastSync:`/`newData` property holding a
    string literal (round-1 F4).
  - The scan for a `connected: true` literal is scoped to `fitnessIntegrations` and `healthIntegrations` and to the
    health/sleep/nutrition/Data Sync builders in `ConnectedApps.tsx`. Shopping lists are excluded: their state is
    real affiliate state (round-2 F8).
  - mobile: with Fitbit connected, the merged list and `getConnectionStats()` count exactly 1.
- Vitest (`Privacy`): the three switches render unchecked and disabled; the export button is disabled.
- `npm test` (includes the nav-registry check), `npm run lint` (i18n rules), `npm run i18n:gate`, `npm run build`.
- `npm run i18n:inventory` for both touched screens, committing the regenerated `docs/SCREEN_INVENTORY.md`
  (round-1 F6).

## Staging verification (read-only)
- Playwright (`e2e` staging spec):
  - sign in as the test user and open `/settings/connected-apps`;
  - assert no health card shows a "Connected"/"Synced" badge unless the gateway lists that provider as connected
    (the spec reads `GET /api/v1/wearables/providers` with the same token and compares);
  - assert the direct `GET /api/v1/wearables/providers` returns at least one provider, which proves the endpoint is
    reachable and the empty state is real, not a silent failure (round-1 F5/Q3);
  - assert no element contains the old fake times or invented history entries;
  - open `/settings/privacy` and assert the three switches are unchecked and disabled.
- Screenshots at 1400×900 and 390×844 for both pages, attached to the PR (CLAUDE.md visual verification).
- GETs and navigation only; the guard aborts any write.

## Not in scope
- Real connect/disconnect UI for wearables, the Health Connect/Apple Health native flow (VTID-05021), consent records
  (D10) and the export job: later WPs.
- Other non-health fake cards on the page (smart home, payments, …), their raw English labels, and Privacy.tsx's raw
  English subtitles: outside the health program; recorded in STATUS.md as follow-ups (round-1 F2/F3).

<!-- plan:end -->
