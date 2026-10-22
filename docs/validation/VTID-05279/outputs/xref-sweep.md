# Cross-reference sweep — vitana-v1 (VTID-05279)
Command (commands.log): `git grep -n -I -E "(ALWAYS|NEVER|IF[-–]THEN)( rule)?s? #?[0-9]+|[Pp]art 1 rules? [0-9]+|…|rules? (2b|10[abc]|[0-9]{1,2}([–-][0-9]{1,2})?)\b" -- CLAUDE.md .claude .kiro docs scripts`
→ 96 lines. Only hits naming a platform rule number that lane `rules-trim` changes or retires are listed; every other
hit names a number the plan keeps (10a–10c, 17, 24, 31/31b/32, 41, 42a, 43–45, 46–50, 51–55, IF–THEN 10, NEVER 26
Wallet) or a non-platform numbering (backend.md §13c Commerce rules 8/9, plan-local numbering) and resolves unchanged.

## Inside lane paths
| File | Reference | Resolves to |
|---|---|---|
| `CLAUDE.md` | "platform CLAUDE.md Part 1 rules 46–50" (Staging gate) | kept 46–50 — no edit |
| `CLAUDE.md` | "`CLAUDE.md` Part 1 rules 51–55" (Sparring gate) | kept 51–55 — no edit |
| `.kiro/steering/*` | none | — |
No hit inside lane paths resolves to nothing; nothing needed fixing.

## Outside lane paths (not edited; listed in the PR body)
| File:line | Reference | Resolves to (plan "Numbering (J)") |
|---|---|---|
| `scripts/whats-new/draft-entry.mjs:140` | "Platform rule 18: log provider, model and latency" | ALWAYS 18 retired → folded into AI-29 (retired-number index) |
| `scripts/whats-new/setup-bedrock-role.sh:15` | "Bedrock IF-THEN 31" | AI-31 (alias "cited elsewhere as IF–THEN 27–31") |
| `docs/validation/VTID-04889/plan-sparring.md:35` | "IF-THEN 26/27" (Gemini forbidden) | IF–THEN AI 26 retired → ALWAYS 10a; 27 → AI-27 |
| `docs/validation/VTID-04967/plan-sparring.md:20` | "CLAUDE.md rule 26" (visual verification) | IF–THEN 26–30 (visual) → condensed unnumbered paragraph (retired-number index) |
| `docs/validation/VTID-05206/plan-sparring.md:132`, `staging-tests.json:16` | "rules 31–32" | kept test-account rules 31/32 |
| `docs/programs/native-app/NATIVE-APP-PLAN.md:171`, `docs/validation/VTID-04983/plan-sparring.md:118,152`, `VTID-05021/plan-sparring.md:25` | "NEVER rule 26" (Wallet routes) | kept NEVER 26 |
None of these is in `.claude/rules/**` or `.kiro/steering/**`.
