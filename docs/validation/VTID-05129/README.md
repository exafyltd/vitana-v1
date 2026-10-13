# VTID-05129 — community-app full STAGING-VERIFY green (spec half)

The runner/guard half is vitana-platform PR #4072 (merges first). This PR updates
staging specs whose assertions encoded behaviour later changed on purpose, or
that measured the page wrongly. No product code changes.

| Failing suite (run 38295808979) | Fix here |
|---|---|
| VTID-04658, VTID-04723 `http /` | body check is version-agnostic (`/command-hub/orb-widget.js?v=`); the pinned widget-URL checks stay |
| VTID-04675/04676 | `live_rooms` is admin data now switched on; assert every offered category is shown |
| VTID-04793 | open registration via the AI/agent sheet's manual fallback (VTID-04839/04848) |
| VTID-04795 | in-development badge matches the AI-setup flag the page reads |
| VTID-04796 | wait for the chooser to close before checking business-context |
| VTID-04827 | stub the profile lookup in the browser so cards render and the viewed_at PATCH is attempted (and aborted) |
| VTID-04760..04763 (Audiobook) | tolerate MatchesPreview's daily_matches PATCH (stays aborted) |
| VTID-04973 | measure through nested `display: contents` layers |
| VTID-04682, deploy, VTID-04989 | runner/guard half (vitana-platform #4072) |

Proof: a full STAGING-VERIFY community-app run with 0 failures after both PRs merge.

## Fix-forward 1 (after proof run 38363989362: 518 passed, 5 failed)

| Suite | Change |
|---|---|
| VTID-04973 | The feed now measures correctly (`post,info,post,info,…`). The first slot is the VitanaIndexCard, which renders nothing for the account (it returns null while loading, without an index, or once dismissed; its slot is `empty:hidden`). That is composeFeed's documented trade-off. The spec now checks that the first slot in the DOM is an info slot, visible or hidden, and that visible info cards never sit side by side. |
| VTID-04901, VTID-04902 | No change. They failed at 07:58, while staging switched to 2a193a17 mid-run (stage deploy 07:54–08:00). |
| VTID-04989, job timeout | Runner half (vitana-platform #4075). |
| VTID-05081 phone journey | No change. In 1 of 4 journeys in the same run, Events waited more than 10 s on one live-room cover image; the other 3 were ready in about 1 s. This is re-observed in proof run 2. |
