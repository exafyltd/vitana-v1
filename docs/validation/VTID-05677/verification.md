# VTID-05677 — verification and decisions (native-wave2-media-hub-r2/media-hub)

## What the lane ports
| Web destination | Native route file | Screen |
|---|---|---|
| `/comm/media-hub` (+ `?tab=shorts|music|podcasts`, `?short=<id>`) — rows COMM.MEDIA_HUB / MEDIA_SHORTS / MEDIA_MUSIC / MEDIA_PODCASTS | `apps/mobile/app/(app)/comm/media-hub.tsx` | `src/screens/media/MediaHubScreen.tsx` (mobile, non-Spotlight branch of `src/pages/community/MediaHub.tsx`) |
| `/community/media-hub` (`src/App.tsx:1321`, `<Navigate>`) | `apps/mobile/app/(app)/community/media-hub.tsx` (`<Redirect>`, query kept) | `native_only` ledger entry |

## Data sources (class-B, behind `src/ports/media.ts` `MediaHubData`; `src/screens/media/data/*`)
`media_videos` + `profiles` (shorts, like, delete, edit), `media_uploads` + `music_metadata` / `podcast_metadata` (lists, audio upload), `bookmarked_items` (+ realtime), `media_video_comments`, `media_video_comment_likes`, Storage buckets `media` and `media-uploads`, gateway `POST /media-hub/shorts/extract-thumbnail`. Core: `SHORTS_TAG_IDS` re-export and the `Short` / `FetchShortsParams` / `DeleteShortInput` types (`extract.json` entry `media`).

## Decisions taken (inside the approved plan, most conservative option)
1. **Video types**: web accepts `video/mp4|webm|ogg`; iOS photo-library videos are usually `video/quicktime` (.mov), so `video/quicktime` is also accepted. Size (500 MB) and duration (5 min) limits as web.
2. **Smart upload** (AI title / tags from video frames, web `useAutoShortMetadata`) and **thumbnail capture from the video** (web canvas) are not ported: they need frame extraction and the app has no frame-grab package; this lane adds no package (plan Decision 5). The fields are shown directly; a custom thumbnail is picked from the library.
3. **Carousel**: a plain card list in the page scroll view; the web scale / opacity emphasis of the visible card and per-card scroll snap are decoration of the web scroller.
4. **Enrichment strip**: server cards only; the static feature cards F5 / F7 / F10 have no native twin yet.
5. **Sheets in the feed**: the comments, edit and delete sheets are drawn inside the feed's native modal (a kit sheet portals behind a native `Modal`).
6. **Sound preference** of a session is held in module state (web `sessionStorage 'shorts_audio_enabled'`).
7. **Deep link**: after consuming `?short`, the screen sets `tab=shorts` too, so a stale `?tab=` cannot switch the mode under the open feed.
8. Share uses React Native `Share`; the web URL needs `config.webBaseUrl` and is omitted otherwise; no production host literal in the app.

## Deferred
Vitana Index pill and Autopilot pending count (health / journey lanes, same deferral as the merged Home port). Device runtime (Maestro, simulator / emulator screenshots, real playback and pickers): G1, `next_actor: owner`.

## Checks (see commands.log)
`npx jest` full suite 206 suites / 5767 tests green; `npm run typecheck`; `APP_PROFILE=development npm run bundle`; `APP_PROFILE=development EXPO_OFFLINE=1 npm run deps:check`; `parity-ledger --check`; `core-closure --check`; `gen-core-extract --check`; `check-shell-pins`; ESLint on the lane files.
