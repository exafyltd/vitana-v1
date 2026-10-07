# Plan sparring record — VTID-04945 (item 5 of the plan sparred under VTID-04938)

Sparred and owner-approved plan: `exafyltd/vitana-platform` `docs/validation/VTID-04938/plan-sparring.md` (plan hash `4f2e36ed66177ffaf3b1b06633b19e63442d12c3da7e16e58c39fed3ff3c5224`, CONVERGED after 2 rounds). Owner instruction 2026-10-07: "Ok, item 5 move ahead".

## Narrowings while implementing (recorded, no new risk)
- **Privacy:** the plan said "a privacy-policy section for AI-assistant connectors". The existing `/privacy` is Exafy LTD's dated legal text; amending it is a legal change. Instead a separate public notice `/commerce/connect/privacy` covers only what the connector adds and links to `/privacy`. Its wording needs the owner's approval before it is published; retention periods and processor names are deliberately not stated because they are not documented in the repo.
- **What's New entry:** not added. vitana-v1 CLAUDE.md says what's-new cards go to every tenant member with a push; a supplier-facing connector page is not something members notice. The owner can add an entry (`src/whats-new/entries/`) if wanted.
- **Screen registry:** `/commerce` is already an excluded prefix in `src/navigation/registry/exclusions.json`, so the two new routes need no registry entry.
- **Locales:** German (source of truth) and English shards were written; the other locales are filled by the repo's translation propagation, not by hand.

## Verdict
Scope narrowed; owner informed in chat.
