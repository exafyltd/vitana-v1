# VTID-04739 — What's New auto-draft on merge

After a PR lands on main, WHATS-NEW-DRAFT.yml asks a Claude model (AWS Bedrock)
whether members would notice it and, if so, opens a PR with a drafted EN/DE
What's New entry for a human to approve. Inert until WHATS_NEW_BEDROCK_ROLE_ARN exists.

AC-1: a PR with no VTID, or that only changes docs/tests/CI/i18n, or that already adds an entry, or is itself a What's New entry PR, is skipped without a model call.
TEST: npx vitest run src/whats-new/draft-entry.test.ts

AC-2: a model reply is accepted only if it validates like a hand-written entry (en+de, du-form German, length, a real route); an invalid reply gets one repair round, then the PR is skipped and nothing is opened.
TEST: npx vitest run src/whats-new/draft-entry.test.ts

AC-3: the drafter uses Bedrock only (never the direct Anthropic API), treats PR text as data, logs provider/model/latency, and the workflow does nothing without the role secret.
TEST: npx vitest run src/whats-new/draft-entry.test.ts

AC-4: the drafted entry is a file in a PR, never a direct publish; a human merges it and the existing production-manifest gate (VTID-04733) still decides when members see the card.
TEST: npx vitest run src/whats-new
