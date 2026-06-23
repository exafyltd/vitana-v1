# Plan — News card kebab menu (community feed moderation/safety)

**Status:** proposal (no code yet)
**Component:** `src/components/home/NewsPostModerationMenu.tsx`
**Builds on:** VTID-03319 Phase 1 (migration `20260622120000_vtid_03319_phase1_moderation.sql`)

## Context — what already exists

The dangerous-actions concern ("every user can delete a post / ban the author")
is **already addressed**. The current menu is role-gated and server-enforced:

- UI: `Remove post` / `Ban author` are wrapped in
  `canModerate = isExafyAdmin || currentRole === 'admin' || currentRole === 'staff'`.
  A normal member never sees them. The screenshot that prompted this is the
  **admin** view.
- Server (defense in depth): `moderate_profile_post()` and
  `set_user_suspension()` both re-check `is_community_moderator()` and raise
  `NOT_AUTHORIZED`. A forged client call still fails.
- Report → queue → admin decision already works: members insert into
  `content_reports`; admins triage at `/admin/community`
  (`src/pages/admin/community/ReportedContent.tsx`) with
  pending/reviewing/resolved/dismissed tabs, admin notes, remove/dismiss.
- Supporting tables: `user_suspensions` (has `expires_at` → temp bans already
  supported at the DB level), `moderation_actions` (audit log), posting
  rate-limit + suspended-user post block triggers.

So the governance model is shipped. The work below is **UX cleanup + missing
member/author affordances**, not a rebuild.

## Proposed menu by viewer

| Viewer | Items |
|--------|-------|
| Member (other's post) | `Report post` → reason sheet · `Hide post` · `Mute author` · `Block author` |
| Author (own post) | `Edit post` · `Delete post` |
| Moderator | `Report post` · `Remove post` · `Ban author` (unchanged) |

---

## Workstream 1 — Report → reason bottom sheet (low risk, no schema change)

**Problem:** four report rows (`sexual/hate/spam/other`) sit directly in the
kebab — that's the clutter in the screenshot. Also the reason set is out of sync
with the admin queue, whose `getReasonBadge` already styles
`harassment`, `inappropriate`, `violence`, `misinformation`.

**Change:**
- Replace the four inline rows with a single `Report post` item.
- Tapping it opens a bottom sheet (`Sheet`/`Drawer` from shadcn) with the full
  reason list aligned to the admin queue:
  `sexual`, `hate`, `harassment`, `spam`, `misinformation`, `violence`, `other`.
- Add an optional free-text `description` field → already a column on
  `content_reports` and already rendered in the admin queue; the menu just never
  sent it.
- Keep the existing `content_reports` insert; add `reason` + `description`.

**Touches:** `NewsPostModerationMenu.tsx`, i18n shards
(`src/i18n/de/screens.json` first, then `en/es/sr`). No migration.

---

## Workstream 2 — Author self-actions (Edit / Delete own post)

**Problem:** an author currently sees nothing on their own post (report items are
hidden for own posts; they're not a moderator). They cannot remove their own
content from the feed.

**Change:**
- When `user.id === authorId`, render `Edit post` + `Delete post` instead of the
  report items.
- `Delete`: simplest path is a soft delete via the existing
  `moderation_status='removed'`, but the current `moderate_profile_post` RPC is
  moderator-only. Two options:
  - (a) Add an owner branch to the RPC: allow `auth.uid() = post.user_id` to set
    their own post to `removed`. Logs to `moderation_actions` as
    `post_removed_by_author`.
  - (b) Hard `DELETE` via RLS owner policy if a real delete is preferred.
  Recommend (a) — keeps one audited path and is reversible.
- `Edit`: route to the existing post-edit flow if one exists; otherwise an
  inline edit sheet. (Needs a quick check for an existing edit composer before
  committing to scope.)

**Touches:** `NewsPostModerationMenu.tsx`, possibly the Phase 1 migration (new
RPC branch), i18n.

---

## Workstream 3 — Personal feed controls (Hide / Mute / Block / Not interested)

**Biggest lift — needs new infrastructure.** `moderation_status` is global
(admin), so per-user preferences need their own storage + feed filtering.

**Schema (new migration):**
- `user_hidden_posts(user_id, post_id, created_at)` — `Hide post` /
  `Not interested`.
- `user_muted_authors(user_id, author_id, created_at)` — `Mute author`.
- `user_blocked_authors(user_id, author_id, created_at)` — `Block author`
  (stronger; can also suppress interactions later).
- RLS: each row owned by `user_id = auth.uid()`.

**Feed filtering:** the `all-news-feed` query (the queryKey invalidated in the
component) must exclude posts hidden by, or authored by someone muted/blocked
by, the current user. Cleanest as a view or an RPC that joins these tables;
otherwise client-side filtering as an interim step.

**Touches:** new migration, feed query/hook, `NewsPostModerationMenu.tsx`, i18n.
`Not interested` can reuse the hidden-posts table and later feed the recommender.

---

## Explicitly out of scope (kebab)

- **Suspend/Warn with durations** — belongs in the admin review queue, not an
  inline card action. DB already supports `expires_at`; expose duration in the
  *admin* UI instead.
- **Copy link / Save / Follow** — nice-to-have, defer.

## Suggested sequencing

1. WS1 (report sheet) — immediate clutter fix, no migration, low risk.
2. WS2 (author edit/delete) — clear gap, small migration.
3. WS3 (personal feed controls) — separate PR; schema + feed-query change.

## i18n / verification notes (per CLAUDE.md)

- New strings: German shard first, then mirror EN/ES/SR. Use `t(...)` / `notify`.
- Run `npm run i18n:inventory` before PR; commit regenerated inventory.
- After any UI change: Playwright screenshot the menu in desktop (1400×900) and
  mobile (390×844), open the report sheet, and inspect before reporting done.
