# VTID-04989 — acceptance

AC-1 A missing /assets/ file is a 404 marked `Cache-Control: no-store` (never cached by Cloudflare or the browser); existing assets keep the 1-year immutable cache.
TEST: npx vitest run src/lib/boot-recover.test.ts (nginx.conf guard); local nginx run in outputs/nginx-local.txt; scripts/ci/verify-rollout-guarantees.sh in AWS-STAGE-DEPLOY-FRONTEND.yml

AC-2 /boot-recover.js is the first script in <head> of the built page and is served as JavaScript with `no-cache`, never the SPA fallback.
TEST: npx vitest run src/lib/boot-recover.test.ts; outputs/build-order.txt; scripts/ci/verify-rollout-guarantees.sh

AC-3 If the entry bundle fails before the app mounts, the page reloads (2 s / 10 s / 45 s, at most 3 in 3 minutes, same-origin /assets/ only, never after mount, never without sessionStorage).
TEST: npx vitest run src/lib/boot-recover.test.ts; browser simulation in outputs/rollout-sim.txt

AC-4 Simulated rollout in a real browser against the real build: with the fix the page renders after the entry comes back; without it the page stays blank.
UI: outputs/rollout-sim.txt (Chromium, local nginx serving the built dist/)

AC-5 Every staging deploy fails loudly if the page does not load the script first, the script is not JavaScript, or a missing asset is cacheable / served from the CDN cache.
TEST: scripts/ci/verify-rollout-guarantees.sh — passes on the fix, fails on main's nginx.conf and on current staging (outputs/verify-script.txt)

AC-6 Production: after every deploy the workflow probes a missing asset on the apex (vitanaland.com, behind the vitanaland-proxy Worker); a failure turns the run red without triggering the automatic rollback.
TEST: AWS-PROD-DEPLOY-FRONTEND.yml last step, `if: success()`, placed after the rollback step

AC-7 Staging rollout proof (after merge): a browser-like poll across the staging rollout always ends with the entry loading, and no 404 is a Cloudflare HIT.
UI: outputs/staging-rollout-poll.txt (added after the staging deploy of this change)
