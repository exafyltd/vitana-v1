# Execution continuity — when a fix is found, the work continues

Owner rule (2026-11-09). Applies to every session that works on a UX or code fix.

1. Once a fix is identified, the work continues in the same turn through the full process:
   plan -> sparring when the change class requires it -> machine approval on convergence
   -> VTID -> implement -> test -> PR -> merge -> verify.
2. Do not stop after saying "this needs sparring" or "this needs a plan". Start the step, or ask the owner
   one question that names the step. Never announce a requirement and then end the turn.
3. The only stops are the ones the rules name: the owner's Gate 2 publish command,
   a blocker that needs a credential or a membership or write action only the owner can perform, and a
   failure that survives three fix-forward attempts.
4. While a background check runs (sparring, CI, a staging run), keep the work moving on everything that does
   not depend on it, and report the status in one line. Do not end the turn to wait without saying what is pending.
