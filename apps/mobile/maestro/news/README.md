# Maestro — news lane (VTID-05298) — DEFERRED to G1 (`next_actor: owner`)

Device-runtime parity for the native news / post reader port. These flows are
**not run in CI** and are **not a merge blocker** (requirements R5.3, tasks §7).
They need the isolated G1 test environment (and macOS minutes / G3 for iOS on a
device). Recorded here and in `docs/validation/VTID-05298/staging-tests.json`.

Flows (to author on G1):

- `01-news-detail.yaml` — open a feed card → `/news/:id` renders the reader
  (hero image, category, title, summary, source); back returns to the feed;
  parity vs the 390×844 read-only staging `/news/:id`.
- `02-post-detail.yaml` — follow a like/comment push → `/post/post/:id` and
  `/post/media/:id` render the single post / video; not-found for a deleted
  post; parity vs the 390×844 read-only staging `/post/:source/:id`.

Until G1, the port is proven offline by the jest-expo + RNTL unit tests in
`apps/mobile/tests/news/` and the typecheck / bundle / deps / parity gates.
