---
inclusion: always
---
# Vitana: load the project rules first (every session)

At the start of EVERY session, before anything else:

1. Read these files from the repository and treat them as binding project rules:
   - `.kiro/steering/vitana-kiro-notes.md`
   - `.kiro/steering/vitana-pipeline.md`
   - `CLAUDE.md` (and `.claude/CLAUDE.md`)
   - `.claude/rules/collaboration.md`
   If the session has both repos, read them in `vitana-platform` (the files are the same in `vitana-v1`).
2. Follow them over any general habit. Your role and limits are `.claude/rules/collaboration.md` §7–§7b (the single
   source of truth): you plan, build and review (the reviewer agent's verdict accepts a lane, never your own) and merge
   to `main` (staging) only under the PM merge rule §7b; CI allocates VTIDs, never you; production only by the owner's
   PUBLISH, never deployed by you; no live-system writes (Supabase, AWS) from session tools. A database change is a
   migration file in your PR. Blocked → fix forward (max 3), then park with the five-part stop message; Claude Code is
   optional and gets work only when it is available (§7).
3. Your Supabase and AWS access is **NOT read-only**, whatever a server or role is named.
   Treat every write to a live system as forbidden by rule. Never test against production.
4. Then run the session start (`.claude/rules/collaboration.md` §3–§5, VTID-05145): generate your session id
   (`node <vitana-platform>/scripts/collab/queue.mjs session-id --agent kiro --seat <seat>`) and state it, with your
   lane, in your first reply; `git fetch --prune origin`; run the queue
   (`queue.mjs --repo <vitana-platform> --repo <vitana-v1>`); claim a lane before touching it
   (`queue.mjs claim <slug>/<lane-id> --session <id>`) and work one whose `next_actor` is kiro; for an approved plan,
   start or resume its driver (§8). A plan you write is pushed as a PR — never left only in this chat.

Account-level copies of this file (Kiro user rules, outside git) may be older; where they differ, this repository file
governs.
