# Review — VTID-05298 (native-wave2-home-feed-news / news)

Reviewer: independent Kiro review pass.
Branch: `kiro/native-wave2-home-feed-news/news`, worktree `.worktrees/nat-w2-news`.
Diff: `git diff origin/main...HEAD` — 31 files, +1452 / −2.

## Verdict: APPROVED — no blocking findings.

## What I reviewed

The native News/Post reader lane: `/news/:id` and `/post/:source/:id` reader
ports plus the `NewsArticleCard` native twin. I read the full diff, the two
web screens it ports (`src/pages/NewsArticleDetail.tsx`,
`src/pages/PostDetail.tsx`), the web source helper (`src/lib/news-images.ts`),
the recorded verification (`verification.md`), `scope.json`,
`staging-tests.json`, all 11 i18n shards, and the parity ledger diff. I did
NOT re-run the suites; I relied on the coder's recorded evidence (typecheck
PASS, scoped jest 17/17 PASS, bundle PASS, parity-ledger `--check` PASS,
core-closure `--check` PASS) and spot-read the source for correctness.

## Acceptance criteria

**1. 1:1 parity with the web screens — PASS.**
- `NewsDetailScreen.tsx` is a faithful twin of the `NewsArticleDetail.tsx`
  non-Spotlight mobile-web branch: sticky top bar + back control, 16:9 hero
  with primary→fallback swap (same `onError` logic as the web `HeroImage`),
  category label (COMMUNITY vs pillar-uppercase, identical derivation), title,
  summary, source row, and the exact same action set and order — greet
  (`/inbox/u/:id`) + view profile (`/u/:id`) for a member card; the internal-
  link branch; read-on + open-in-browser for an external link. Catalog keys
  reused verbatim (`newsCard.member.sayHello`, `newsCard.member.viewProfile`,
  `newsCard.detail.readOn`, `newsCard.detail.openInBrowser`, `newsCard.detail.back`).
  The web redirects to `/home` when the article is absent; the native renders
  an explicit not-found state (correct — a cold deep link cannot carry the
  router-state article), which is a sound native adaptation, not a parity gap.
- `PostDetailScreen.tsx` mirrors `PostDetail.tsx`: the same `fetchPost` /
  `fetchAuthor` shape against `profile_posts` / `media_uploads` /
  `global_community_profiles`, loading / not-found (deleted) / error states,
  author + body + image/video poster + like/comment counts. The web renders
  the interactive `CommunityPostCard`; the native keeps a self-contained,
  dependency-light card so the two lanes stay disjoint (documented decision).
  `attached_ref`/`attachedRefOf` is omitted — a reader-only simplification,
  acceptable and documented; it does not reach the native deep-link target's
  required behavior.
- `NewsArticleCard.tsx` native twin present, presentational (`onPress` ↔
  web `onClick`), same image fallback behavior, same fields. Single owner;
  Home's feed consumes it via the port (design decision 3). The web kebab
  menu is correctly omitted from the reader port.

**2. Built on @vitana/core + @vitana/tokens + @vitana/ui on the N3 shell — PASS.**
Screens import UI primitives through `src/ports/ui`, tokens through
`src/ports/tokens`, and the one shared helper through `src/ports/news.ts`
(which re-exports from `@vitana/core/news-images`). `tests/ports.test.ts`
(reported green) bans direct `@vitana/*` imports in `src/screens/**`; the
screens respect it.

**3. Parity ledger + routes — PASS.**
`NEWS.DETAIL` (`/news/:id`) and the exclusion `/post/:source/:id` both flipped
`not_started` → `native` (ledger diff confirmed). Route files present:
`apps/mobile/app/(app)/news/[id].tsx` and
`apps/mobile/app/(app)/post/[source]/[id].tsx`, each a thin default-exporting
wrapper. `parity-ledger.mjs --check` reported OK (435 rows, 11 native routes).

**4. Lane scope respected — PASS.**
All 31 changed files fall inside the declared scope (`scope.json` paths match
the diff stat exactly): `apps/mobile/app/(app)/news|post/**`,
`apps/mobile/src/screens/news/**`, `apps/mobile/src/ports/news.ts`,
`apps/mobile/tests/news/**`, `apps/mobile/maestro/news/**`,
`apps/mobile/parity/ledger.json`, `src/i18n/*/newsNative.json`,
`packages/core/**` (only `news-images.ts` + `manifest.json` +
regenerated `closure.generated.json`), `scripts/native/mobile-ci-paths.generated.json`,
`docs/validation/VTID-05298/**`.
The home lane's `feed-compose` / `news-feed-ranker` core extraction was NOT
touched — the only core extraction is `news-images.ts` (the pure cover-image /
pillar helper), tagged `"lanes": ["news","home"]`. This is the news helper,
not the feed ranker. No out-of-lane file.

**5. CLAUDE.md rules — PASS.**
- React 19: every component typed `ReactElement`; no global `JSX` namespace use.
- i18n: new strings in `de/newsNative.json` first, du-form ("Geh zurück zum
  Feed"), mirrored to all 11 locales (ar de en es fr pl pt ru sr tr zh — all
  present and actually translated, Arabic not left in English). All user-visible
  text via `t(...)`; no raw strings in the screens.
- RTL-safe: logical props only (`end: 8` on the video badge; `me-/ms-` absent
  because screens use gap-based rows). `tests/i18n-rtl.test.tsx` reported green
  (no-physical-direction across 11 locales).
- Tokens only: colors from `useUITheme().colors`, radii from `ports/tokens`;
  no hardcoded palette.

**6. Unit tests present and green per recorded evidence — PASS.**
`tests/news/news.test.tsx` covers: news detail loaded / external-action /
member-greet / not-found; post reader loaded / video / deleted / fetch-error;
NewsArticleCard render + image fallback; param parsers; deep-link resolution +
route default-exports. Recorded `npx jest tests/news` = 17/17 PASS. Device-
runtime (Maestro + simulator/emulator screenshots + staging screenshot parity)
is deferred to G1 as `next_actor: owner` and recorded in `staging-tests.json`
— correct per the lane contract, not a finding.

## Verification evidence

Present and sufficient (`verification.md`): typecheck PASS, scoped jest 17/17
PASS, dev bundle PASS, deps:check PASS, ports/navigation/i18n-rtl regression
suites PASS (557), `parity-ledger --check` PASS, `core-closure --check` PASS.
Port re-export validated by source: `getNewsImage`, `getArticlePillar`,
`mapTagToPillar`, `LONGEVITY_PILLARS`, `LongevityPillar` all exist in
`src/lib/news-images.ts` as exported, so the `ports/news.ts` re-export resolves.
The documented decisions (RN `Image` not `expo-image`; local reader type
shapes to avoid dragging the web `import.meta` graph into the native tsc;
`SCREEN_INVENTORY.md` not committed due to Windows path corruption) are
conservative and inside the approved plan.

The pre-existing `well-known-unchanged.test.ts` failure is on files outside
this lane with zero diff vs HEAD — pre-existing, not caused by this change,
out of scope.

## Findings

None blocking.
