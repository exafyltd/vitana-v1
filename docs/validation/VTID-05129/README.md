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

## Amendment A1 — phone journey median of 3 (after proof runs 2 and 3)

Every full run had one of the ~4 phone-journey executions miss one timing budget by 1–11 %, a different step each
time (run 3: News return 1518 ms vs 1500; the other samples 1030–1250 ms). Owner decision 2026-10-13: judge each step
on the median of three passes with the same budgets, and pause merges for the final full run. The spec now runs the
journey three times on the same guarded page (storage, Cache Storage and the in-test image cache reset between
passes; sign-in kept). One slow sample no longer fails a step; two out of three still do. A photo re-download or a
frame jump fails in any pass. Sparring record: plan-sparring.md, Amendment A1 (converged, 2 rounds).

## Fix-forward 2 — image capture lag is not a re-download

Change run 38458755133 (community-app @ d8bc6635): the journey reported a live-room cover as "re-downloaded" on the
Events return visit in pass 2. The URL was identical on both visits and the response is cacheable
(`Cache-Control: public, max-age=3600`, ETag), so a phone serves it from cache. The in-test cache only stores an image
once Playwright hands over its body, which can lag under the throttle, while the image was already marked "loaded".
Now a request waits (≤ 3 s) for a body still being captured, and an image counts as loaded only once it is cached —
or when it is not cacheable at all (then a second fetch is a real re-download, as before).
