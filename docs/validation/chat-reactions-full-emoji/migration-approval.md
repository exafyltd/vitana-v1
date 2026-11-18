# Migration approval: 20261117120000_message_reactions_full_emoji

Status: **pending owner approval** (stop 1, collaboration.md §7d). Nothing is applied.

## 1. Exact file
- Path: `supabase/migrations/20261117120000_message_reactions_full_emoji.sql`
- SHA-256: `d6e0f256ae879e40c74f86a77b19cb353a4907e2f1c8c6b0bfdf2b649933bc8e` (6753 bytes)
- Git blob: `e386d75cd59a220390a153ba0a3c5a1bc83e8677`
- Branch: `kiro/chat-reactions-full-emoji/reactions` (replacement of #1697), commit that last changed the file: `9753b758c`.
- Contents: lookup table `message_reaction_emojis` (181 rows, same order as `reaction-emojis.json`, verified), RLS select-only for `authenticated`, FK `message_reactions_emoji_fk` replacing the six-value CHECK, BEFORE INSERT cap trigger (six distinct emojis per member per message, `reaction_cap_reached`).

## 2. Target database
- Supabase project `VITANA`, ref `inmkhvwdcuyhnxkgfvsb` (eu-north-1, Postgres 17). The only Supabase project.
- Staging and production both use this database (CLAUDE.md, staging-first rules). Applying it changes live data for all members.

## 3. Read-only compatibility check (SELECT only, 2026-11-18)
- 352 rows; six distinct emojis; 0 rows outside the 181 set; 0 bare-heart rows; no lookup table or cap function yet; migration not in `schema_migrations`.
- `toggle_message_reaction(uuid,text)` and `_text` write to the table without normalising (no client calls them; a bare heart is refused by the FK as it is by the CHECK today).
- Policies (insert own, delete own, select for accessible messages), trigger `trg_notify_reaction`, and realtime publication are unchanged.

## 4. Rollback rehearsal (isolated database, reactions outside the six added first: 4 rows, 🍎 🌻 🔥)
| Mode | Result |
|---|---|
| Statements run one by one (autocommit) | FAILS at re-adding the six-value CHECK. Cap trigger and FK are already gone; lookup table remains; outside rows remain. **Unsafe; do not use.** |
| One transaction (`BEGIN … COMMIT`, as in the header) | Aborts, everything rolled back. State identical to before. **Safe.** |
| Delete outside-six rows after backup, then transaction | Succeeds. 4 member reactions deleted (`message_reactions_outside_six_backup` keeps them). Rows identical: no. **Loses data; owner decision only.** |

Full output: `outputs/rollback-rehearsal.txt`.

## 5. What makes outside-six rows appear
- Picker flags are off, but the ORB `react_to_message` tool uses the gateway list. Once the migration **and** the gateway change are live, the voice tool can write any of the 181 emojis even with the picker off.
- Therefore a later rollback can meet outside-six rows. Decide before rollback whether they are kept (rollback then cannot run) or deleted (member data lost).

## 6. Release sequence (after approval)
1. Owner approves this file hash and the target database.
2. Apply the migration through the approved workflow (RUN-MIGRATION / apply-*.yml). Verify read-only: 181 lookup rows, FK present, trigger present, row count unchanged (352).
3. Merge the vitana-v1 lane PR (flags stay `false`). Staging deploy. STAGING-VERIFY on the merge commit.
4. Merge the vitana-platform lane PR (gateway tool). Staging gateway deploy. STAGING-VERIFY on the merge commit.
5. Gate 2 to the owner. Production publish and flag changes are separate owner decisions.

## 7. Isolated test results (this branch)
- Cross-client check (mobile add, web sees and removes, legacy heart, cap refusal, mobile reload): 3 web + 2 mobile, all pass (`outputs/cross-client-isolated.txt`).
- Migration applies to the original table; six existing rows identical before and after.

## 8. Approval requested
Approve or refuse applying `20261117120000_message_reactions_full_emoji.sql` (SHA-256 above) to project `inmkhvwdcuyhnxkgfvsb`, and choose the rollback stance in §5.
