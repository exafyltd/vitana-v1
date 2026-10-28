# Planner responses — round 1 (session_015sc5wWvYz6sSRJgZVJ732d)
- F1 minor — ACCEPTED: comment on the IME guard that it reads the DOM event, not the typing-indicator state (plan item 3). No rename (churn).
- F2 minor — REJECTED: `handleKeyPress` carries the VTID-04926 mention-consumed flag (MessageInput.tsx:254-264) that its tests pin; some keyboards still fire keypress after a prevented keydown. Kept as is; removal is out of scope.
- F3 minor — ACCEPTED as a PR note: R1.2 text-wins is the deliberate rule; the PR body states the copy-image-from-browser edge case.
- F4 minor — ACCEPTED: verified `docs/validation/VTID-04966/staging-tests.json:8` names the old spec. The lane repoints it to the new spec (docs/validation/VTID-*/** is in lane paths).
- F5 major — ACCEPTED (wording): design already called preventDefault before the send, but the "otherwise default" line was ambiguous. Plan now: desktop Enter always preventDefault, handleSend called unconditionally (guards at MessageInput.tsx:~182 no-op when empty / uploading / sending / no conversation). Also avoids the stale `canSend` closure.
- F6 — no action.
