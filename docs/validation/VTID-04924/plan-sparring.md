# Plan: let the VTID-04921 staging spec tolerate the group chat's signed-URL requests (vitana-v1)

Change class: **light** (one test file + the validation record; no source, migration, route, auth, workflow or deploy files).
Owner request (2026-10-06, chat): "fix the test now then publish both" — after STAGING-VERIFY of e166677 failed 11/12 on exactly this spec (run exafyltd/vitana-platform#37479252753, job 112337607731).

<!-- plan:begin -->
## Context (verified by the planner from the run log and the code)
- `tests/e2e/staging/vtid-04921-group-chat-latest.staging.spec.ts` (merged in PR #1246) opens the "Alle Beisammen" group chat on staging, read-only, behind `./staging-guard`, which aborts every non-GET request except those matched by the spec's `allowAbortedWrites` regex and reports any other aborted request as a failure.
- The run failed with: "staging-guard aborted 40 request(s) … POST …/storage/v1/object/sign/chat-attachments/<group>/<user>/<file>.jpeg" — the group chat renders image attachments by asking Supabase Storage for signed URLs (`createSignedUrl` → a POST to `/storage/v1/object/sign/<bucket>/<path>`). Creating a signed URL reads nothing back into the database and writes no row or object; the guard aborts it like every other POST, so nothing leaves the browser.
- The spec's own comment says only the group's mark-read POST is expected; the signed-URL POSTs were not anticipated. Other staging specs already list read-only POSTs in the same way (e.g. the Live Rooms spec tolerates `get_live_stream_subscriber_counts`).
- The assertion the spec exists for (the scroll area rests at the bottom with the newest message on screen) is separate from the guard report; the test failed ONLY on the guard's list of unexpected aborted requests.

## Change
1. In the spec's `allowAbortedWrites` regex add one alternative, exactly: `inmkhvwdcuyhnxkgfvsb\.supabase\.co\/storage\/v1\/object\/sign\/chat-attachments\/` — scoped to the Supabase project host, the `sign` endpoint and the `chat-attachments` bucket only (not `/storage/v1/object/` generally, not other buckets, not uploads). Every other aborted request still fails the test; the scroll assertion is unchanged.
2. Update the spec's header comment to name this tolerated request and why it is safe (signed-URL creation, aborted by the guard, nothing written).
3. Validation record: `docs/validation/<VTID>/staging-tests.json` pointing at this same spec as the change's staging suite, and `plan-sparring.md` (this record).
4. No change to the group-chat feature code, to `staging-guard`, or to any other spec.

## Safety argument
The guard's purpose is that no automated staging run writes to production data. A signed-URL POST creates a time-limited read link; with the request aborted by the guard nothing reaches Supabase at all. The allow entry therefore widens what the guard *reports* as a failure, not what can reach the server. It is deliberately a narrow path match, in the same style as the existing entries.

## Out of scope
Making the guard let these requests through, tests for attachments themselves, changes to how the group chat loads images.
<!-- plan:end -->

## Planner responses — round 1
- F1 DEFERRED. `vtid-04901-group-chat-exit.staging.spec.ts` has the same latent exposure but did not fail in the failing run (it leaves the chat before images load); it belongs to another change (VTID-04901) and widening this PR to a second spec is beyond the request ("fix the test"). Tracked as a note in the PR description so the 04901 owner can add the same one-line entry if it ever flakes.
- F2 ACKNOWLEDGED (single-line regex is the established style of all staging specs; no action).
- F3 ACKNOWLEDGED (the guard aborts synchronously so the 40 requests fail immediately; speculative; will watch the first staging runs).
- Q1: not assumed — plan item 4 keeps the change to the 04921 spec only.
- Verification added since the plan was written: the new alternative was matched against the real failing request (matches), an attachment upload `/storage/v1/object/chat-attachments/...` (does not match), a signed URL for another bucket (does not match) and the existing mark-read entry (still matches).
