# VTID-05696 acceptance (session-handover-gitlab/claude-md-v1)

AC-1 CLAUDE.md has the section "SESSION HANDOVER: STRAIGHT TO GITLAB" right after the collaboration section (base: collaboration section CLAUDE.md:96-110, next heading `## Overview` at :112; vitest include `src/**/*.test.{ts,tsx}`; `npm test` ends with `vitest run`), text equal to plan §3.
TEST: npx vitest run src/lib/claude-md-session-handover.test.ts

AC-2 No other line of CLAUDE.md changes (18 added, 0 removed).
TEST: git diff --numstat origin/main -- CLAUDE.md

AC-3 The full suite stays green.
TEST: npm test
