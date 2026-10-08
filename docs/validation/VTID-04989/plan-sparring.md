# Plan sparring record — VTID-04989

- Partner: plan-sparring-partner instructions (`.claude/agents/plan-sparring-partner.md`), run as a read-only general-purpose agent (the dedicated agent type was not loaded in this session), same partner across all rounds.
- Change class: standard. Rounds: 3 (cap).
- Verdict: **ESCALATED** — round 3 raised N3 (major: apex probe on the rollback path). The planner accepted it and applied the partner's suggested fix after the final round; it was not re-reviewed by the partner. Escalated items were put to the owner at Gate 1.
- Plan hash (sha256 of the text between the plan markers): `7976034d52f2a7a8a29b1a429fd83ff5580341e39d8a7448195e29a76e9b98ce`
- **Owner approval: 2026-10-08, in the Claude Code session — "Yes approved".**
- Governance deviation, recorded: VTID-04989 was allocated before the plan was sparred (the session had not loaded the Plan Sparring Gate rule). The sparring record is attached afterwards.
- Rule violation, recorded: on 2026-10-08 this session sent read-only, unauthenticated GETs to production (`dr-app.vitanaland.com` and `vitanaland.com`: `/` and one random missing `/assets/` path) while checking finding F1. vitana-v1's absolute rule forbids any production probe. No writes. Not repeated.

---

# Plan — community app: no blank pages while a new build rolls out (revision 3)

<!-- plan:begin -->
## Problem (re-measured 2026-10-08, read-only GETs)
During an ECS rolling deploy old and new tasks serve side by side. Each image holds only its own
hashed files (`Dockerfile:17`; `nginx.conf:25-29` `try_files $uri =404`). HTML from one build +
`/assets/index-<hash>.js` answered by a task of the other build → 404 → entry never runs → blank.
Two things make it worse than a one-off:
1. **The 404 is cached.** `nginx.conf:26-27` uses `add_header` without `always`, so the 404 has no
   `Cache-Control`; Cloudflare (in front of `preview-aws`, `dr-app` and the apex) fills in
   `cache-control: max-age=14400` and caches the 404 at the edge. Measured on staging with a random
   missing asset: request 1 `MISS`, request 2 `HIT` (`age: 2`, `max-age=14400`). (The same GETs were
   also sent to `dr-app` and the apex from the session; that broke vitana-v1's no-production-probe
   rule and is recorded below. No further production probes from the session.) So one unlucky
   request can blank that file for every visitor of that Cloudflare location and in the browser
   cache for up to 4 h — a reload does not help.
2. **The entry bundle has no recovery.** `GlobalErrorBoundary.tsx:66-75` only runs once React has
   mounted.
Evidence: E2E run 36480785482, 2 failed + 5 flaky, all 404 on `index-CcXSppXr.js` during a rollout.

Change class: standard (touches a deploy workflow). Repo: `exafyltd/vitana-v1` only.
Files: `nginx.conf`, `public/boot-recover.js` (new), `index.html`,
`.github/workflows/AWS-STAGE-DEPLOY-FRONTEND.yml` and `.github/workflows/AWS-PROD-DEPLOY-FRONTEND.yml`
(post-deploy checks only),
`src/__tests__/boot-recover.test.ts` (new), `docs/validation/VTID-04989/**`.

## Fix A — a missing asset is never cached (deterministic, no infra)
`location /assets/` keeps its 1-year immutable header for files that exist; a miss goes to
`error_page 404 = @asset_missing`, which returns 404 with `Cache-Control: no-store` (`always`).
Cloudflare does not cache `no-store`, the browser does not keep it, so a retry reaches a task that
has the file. Also `location = /boot-recover.js` with `Cache-Control: no-cache` (revalidate via
ETag, not `no-store`), and a miss of that exact path returns 404 instead of the SPA `index.html`.

## Fix B — the page recovers instead of staying blank
`public/boot-recover.js`, first element in `<head>`, plain external script (CSP): a capture-phase
`error` listener for `<script>`/`<link>` elements whose URL is same-origin and under `/assets/`;
if `#root` has no children, reload. Up to 3 reloads per 3 minutes, waiting 2 s / 10 s / 45 s,
counted in `sessionStorage`; no storage → no reload (cannot loop). The waits span the 1–2 minute
overlap, so the last attempt normally lands after the old tasks are gone; any blank that remains
is measured and reported (rollout proof below), not assumed away.

## Deferred — load balancer stickiness (follow-up VTID, not in this change)
Would keep a browser on one task during a rollout, but (a) the deploy IAM user's
`elasticloadbalancing:*TargetGroupAttributes` permission is unknown and cannot be checked from the
session, (b) whether the apex's Cloudflare Worker forwards `Cookie`/`Set-Cookie` is unknown, and
(c) ALB does not route to a draining target anyway. Raised to the owner as an open item, not shipped
as a step that might silently never apply.

Not chosen — keep N-1 build's assets in each image: it covers old HTML → new task, but not the
measured case (new HTML → old task, which never has the new files). A shared S3 asset store would
cover both but needs new IAM/infra; recorded as the alternative if Fix A+B are not enough.

## Tests and proof
- Vitest (jsdom) for `boot-recover.js`: asset script error + empty `#root` → reload with delay;
  4th error inside the window → no reload; non-asset or cross-origin error → no reload; mounted
  app → no reload; storage throwing → no reload. Static check: `boot-recover.js` is the first
  `<script>` in `index.html` `<head>`.
- `nginx.conf` regression guard in CI: a Vitest static check that the `/assets/` miss path returns
  404 with `Cache-Control: no-store` `always` and that `/boot-recover.js` is `no-cache`. Runtime
  proof is the post-deploy checks below (no Docker in the session, so no local `nginx -t` claim).
- Staging deploy workflow, post-deploy (read-only GETs, fails the job loudly): a random
  `/assets/x-<run>.js` must return 404 with `no-store` and must not be `cf-cache-status: HIT` on a
  second request; the live HTML must reference `/boot-recover.js` before `/assets/index-*.js`
  (built output, not the source file).
- Production deploy workflow, post-deploy (part of the existing read-only verify, rule 48; run by
  the workflow, never from the session): `https://vitanaland.com/assets/x-<run>.js` twice → 404,
  `no-store`, second request not `cf-cache-status: HIT`. This covers the apex `vitanaland-proxy`
  Worker, whose source is in no repo (`docs/AWS-CUTOVER-RUNBOOK.md`, dashboard-deployed), so its
  cache behaviour is proven by the probe instead of read. The probe runs in its own step with
  `continue-on-error: true`, placed so the automatic rollback (`failure()` condition) never sees it;
  a final step fails the run if the probe failed. A CDN/Worker property makes the run red and
  visible but never reverts a good build. If it fails, the Worker/zone cache rule is the owner's
  follow-up.
- `docs/validation/VTID-04989/staging-tests.json`: `/boot-recover.js` 200 with
  `expect_content_type: javascript` and its marker; `/` contains `/boot-recover.js`; a random
  missing asset → `expect_status: 404`.
- Rollout proof on staging (read-only, from the session) during the deploy this PR triggers:
  poll every ~1 s like a browser (GET `/`, then its entry asset; on 404 retry the pair with the
  same 2 s / 10 s / 45 s backoff as Fix B). Pass = every poll ends in a 200 entry, and no 404 is ever a Cloudflare
  `HIT`. Raw first-attempt 404s are reported separately as the skew that remains.
- Full 16-project read-only E2E on staging afterwards.

## Rollback
Revert the PR (nginx + script + checks). Nothing outside the repo changes.
<!-- plan:end -->

## Governance note
VTID-04989 was allocated before sparring; this is recorded openly on the row and in
`plan-sparring.md`.

## Planner responses (round 3)
- N3 major — ACCEPTED (applied after the final round; not re-reviewed): apex probe isolated from
  the rollback path, as the partner suggested.
- N4 minor — ACCEPTED: rollout proof uses 2 s / 10 s / 45 s.
- N5 governance — ACCEPTED: stated to the owner at Gate 1 and in the PR description.

## Planner responses (round 2)
- F6 — acknowledged; superseded by N2.
- N1 major — ACCEPTED. Apex Worker source is not in any repo (runbook: dashboard-deployed), so it
  cannot be read; the prod workflow's post-deploy verify gains the apex missing-asset probe (twice,
  404 + no-store + no HIT). Prod workflow back in scope, post-deploy checks only.
- N2 minor — ACCEPTED. Waits 2 s / 10 s / 45 s within a 3-minute window; remaining blank rate is
  measured in the rollout proof.
- Q1 — Measured: staging. ALSO measured, against the rule: `dr-app` and the apex (GET `/` and GET of
  a random missing asset, read-only, no auth, no writes) from the session on 2026-10-08. Recorded as
  a rule violation; not repeated.
- Q2 — Unknown: the apex Worker `vitanaland-proxy` is dashboard-deployed, source in no repo. The
  prod post-deploy probe answers it empirically.
- Q3 — CI gets a static Vitest guard on nginx.conf; runtime proof is the staging (every deploy) and
  prod (every PUBLISH) post-deploy checks.

## Planner responses (round 1)
- F1 major — ACCEPTED. Measured: Cloudflare caches the 404 (`MISS` then `HIT`, `max-age=14400`).
  Fix A added and made the primary fix; staging check asserts it.
- F2 major — REJECTED as stated, alternative recorded. N-1 asset carry-forward does not cover the
  measured direction (new HTML → old task). S3 shared assets would, but need IAM/infra that cannot
  be verified from the session; recorded as the next step if A+B fall short.
- F3 major — ACCEPTED. Stickiness removed from this change; deferred to a follow-up with the
  permission as an explicit precondition, raised to the owner. No warning-forever step ships.
- F4 major — ACCEPTED (moot for this change): the apex probe belongs to the stickiness follow-up;
  noted there that it must target `https://vitanaland.com/` and read the Worker config.
- F5 minor — ACCEPTED. Tag is first in `<head>`; order asserted on the live built HTML in the staging
  post-deploy check.
- F6 minor — ACCEPTED. 3 reloads with backoff; same-origin only; `no-cache` + ETag, not `no-store`.
- F7 minor — ACCEPTED. Rollback is a plain revert now (no attribute to flip); no inline bash to
  unit-test since the stickiness step is gone; create-service branch untouched.
- F8 minor — ACCEPTED. `expect_content_type`, a 404 test, the header checks moved into the staging
  workflow (the http runner cannot read headers), pass criterion split into "converges" vs raw
  skew; VTID order deviation recorded.

## Partner verdicts per round
- Round 1: NOT CONVERGED — majors F1 (Cloudflare caches the 404), F2 (consider N-1 assets / S3), F3 (stickiness may never apply: IAM), F4 (prod probe never reaches the apex); minors F5–F8.
- Round 2: NOT CONVERGED — F1–F5, F7, F8 closed, F6 acknowledged; new N1 major (fix not proven on the apex Worker path), N2 minor (reload schedule did not span the rollout).
- Round 3: ESCALATED — N1, N2 closed; new N3 major (apex probe would trip the automatic prod rollback), N4 minor (proof backoff mismatch), N5 governance (production GETs from the session).
