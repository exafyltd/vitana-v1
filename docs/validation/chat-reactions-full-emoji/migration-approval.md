# Migration approval: 20261117120000_message_reactions_full_emoji

Status: **pending owner approval** (stop 1, collaboration.md §7d). Nothing is applied to any database.

## 1. Exact file
- Path: `supabase/migrations/20261117120000_message_reactions_full_emoji.sql`
- SHA-256: `392b8e0a5e033f4f7920f02d60779f932e760abc1f6651088f95200c91739be8` (7209 bytes)
- Git blob: `cf0975d699f8b83947b72f234356a7fd3798aa3e`
- Branch: `kiro/chat-reactions-full-emoji/reactions` (replacement for vitana-v1 #1697), built on main `bbe90b713`.
- Contents: lookup table `message_reaction_emojis` (181 rows, same order as `reaction-emojis.json`, checked by script); RLS select-only for `authenticated`; FK `message_reactions_emoji_fk` replacing the six-value CHECK; BEFORE INSERT cap trigger (six distinct emojis per member per message, `reaction_cap_reached`). No existing row is rewritten.

## 2. Target database
- Supabase project `VITANA`, ref `inmkhvwdcuyhnxkgfvsb` (eu-north-1). The only Supabase project. Staging and production both use it, so applying the file changes live data for all members.

## 3. Read-only compatibility check (SELECT only, 2026-11-18)
- 352 rows; six distinct emojis (👍 113, ❤️ 204, 😂 12, 😮 1, 🙏 15, 🎉 7); 0 rows outside the 181 set; 0 bare hearts.
- No lookup table, no cap function, migration not recorded in `schema_migrations`.
- `toggle_message_reaction(uuid,text)` and `_text` write to the table without normalising. No client calls them. A bare heart is refused by the FK, as it is by the CHECK today.
- Policies (insert own, delete own, select for accessible messages), trigger `trg_notify_reaction` and the realtime publication are unchanged.

## 4. Expanded reactions are gated on all three paths (flags off)
| Path | Gate | Test (committed) |
|---|---|---|
| Web (`useMessageReactions`, context menu, drawer) | `REACTION_PICKER_ENABLED=false`: hook adds only the six; no "+" | `useMessageReactions.gate.test.ts`; `MessageBubble.reaction-picker.test.tsx` (drawer and context menu, flag off) |
| Mobile (`useReactions`, drawer) | `REACTION_PICKER_ENABLED=false`: hook adds only the six; no "+" | `reactions-expanded-gate.test.tsx` (4 pass) |
| ORB voice tool (`react_to_message`) | `REACTION_EXPANDED_ENABLED` unset/false: adds only the six | `reaction-expanded-gate.test.ts` (6 pass; 3 fail without the gate) |
Removals are never gated on any path. Flags are off in the committed code and in the gateway default.

## 5. Rollback procedure (preserves member reactions)
Principle: a rollback never deletes a reaction.
1. **Always first:** disable expanded writes. Set `REACTION_EXPANDED_ENABLED=false` on the gateway and keep `REACTION_PICKER_ENABLED=false` on web and mobile. This stops new outside-six reactions. The wider schema stays in place.
2. **Schema rollback only if the precheck is 0:** `SELECT count(*) FROM public.message_reactions WHERE emoji NOT IN ('👍','❤️','😂','😮','🙏','🎉');` must return 0. Then run the transaction in the migration header (Step 2). It starts with a guard that refuses if any outside-six row exists, and it runs in one transaction so a failure changes nothing.
3. **If the precheck is not 0:** do not roll back. Keep the schema and expanded writes disabled. Existing outside-six reactions keep showing and can still be removed by their members.

Rehearsal on the isolated database, with the procedure text extracted from the migration file:
| Case | Result |
|---|---|
| 4 reactions outside the six (🍎 🌻 🔥) present | Precheck 4. Guard refuses. Transaction rolls back. 10 rows identical, schema unchanged. |
| No reaction outside the six | Precheck 0. Procedure commits. Six-value CHECK restored, cap trigger and lookup table removed, 6 rows identical. |
First attempt (statements run one by one, not in a transaction) failed partway and left the cap and FK removed. Superseded; kept as `outputs/rollback-rehearsal-first-attempt.txt`.

## 5a. Data planes at release (read only, 2026-11-18; evidence in `data-plane-targets.md`)
- Web, mobile and ORB read and write `message_reactions` in Supabase VITANA (`inmkhvwdcuyhnxkgfvsb`) in staging and production.
  Web and mobile builds leave the data API URL empty; the staging gateway `vitana-gateway:1025` reads `vitana/supabase/staging/url`
  and every staging deploy since 2026-11-02 reports `currently on: supabase`.
- Aurora staging backs only the isolated `vitana-gateway-preview` and has no `message_reactions` table.
- Only Supabase VITANA needs this migration for the release. Aurora gets it later, with the cutover.

## 6. Release sequence (after approval)
1. Owner approves this file hash and the target database.
2. Apply the migration through the approved workflow (RUN-MIGRATION / apply-*.yml). Verify read-only: 181 lookup rows, FK and cap trigger present, row count still 352.
3. Merge the vitana-v1 lane PR with both flags off. Staging deploy, STAGING-VERIFY on the merge commit.
4. Merge the vitana-platform lane PR (gateway gate, flag off). Staging gateway deploy, STAGING-VERIFY on the merge commit.
5. Gate 2 to the owner. Turning on any flag, and production publish, are separate owner decisions.

## 7. Evidence on the branch
- Isolated cross-client run (mobile add, web sees and removes, legacy heart, cap, mobile reload): 3 web + 2 mobile pass (`outputs/cross-client-isolated.txt`).
- Rollback rehearsal (above). Gateway gate: `outputs/gateway-gate-jest.txt`, red without the gate `outputs/gateway-gate-red-without-gate.txt`. Web and mobile gate: `outputs/web-gate-vitest.txt`, `outputs/mobile-gate-jest.txt`.

## 8. Approval requested
Approve or refuse applying the file above (SHA-256 `392b8e0a5e033f4f7920f02d60779f932e760abc1f6651088f95200c91739be8`) to project `inmkhvwdcuyhnxkgfvsb`.
