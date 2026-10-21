# Plan sparring record — VTID-05298 (native-wave2-home-feed-news / news)

Copy of the plan's sparring record (authoritative source in `exafyltd/vitana-platform`
on branch `kiro/native-wave2-home-feed-news/plan`:
`.kiro/specs/native-wave2-home-feed-news/sparring/`).

## Verdict

CONVERGED and approved by policy `converged-auto-v1` at 2026-10-21T11:17:45.157+00:00.

- Sparring session: `d108df80-fd56-498d-a0de-871c4c939a4b`
- Final plan hash: `c60167b66118540c3e2b1d16c9ba166c1b90a4527dc519d9aa4b5300b16f79e2`
- VTIDs allocated: VTID-05296, VTID-05297, **VTID-05298** (this lane: `news`)
- Rounds / responses: `sparring/round-1..3.md`, `sparring/responses-1..3.md`,
  `sparring/s2-round-1..3.md`, `sparring/s2-responses-1..2.md`, `sparring/state.json`

## Approval

The converged plan is approved by policy `converged-auto-v1` (owner decision
2026-10-14, VTID-05214/05218): a plan sparred by CI whose session converged is
approved by policy and not sent to the owner as Gate 1. The VTID was allocated by
CI after convergence (`lanes/news.md` log, 2026-10-21T11:19Z).

## Scope of this lane (news)

Port the two reader screens to native at 1:1 mobile-web parity and own the
`NewsArticleCard` native twin:
- `NEWS.DETAIL` → `/news/:id` (web `src/pages/NewsArticleDetail.tsx`)
- `/post/:source/:id` (exclusion row; web `src/pages/PostDetail.tsx`)
- Shared card: `src/components/crossover/NewsArticleCard.tsx`

Both parity rows flip `not_started` → `native`. Requirements R1–R6 and design
decisions 1–5 (`.kiro/specs/native-wave2-home-feed-news/{requirements,design}.md`)
are authoritative.
