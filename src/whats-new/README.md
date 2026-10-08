# What's New — automatic "Brand New Feature" cards (VTID-04733)

Every **finished, new feature** (or redesign) a member will notice ships with **one file** in `entries/`. Fixes, partial work and anything still being finished get **no** card (owner rule 2026-10-08).
Nothing else is needed: once the build carrying it is live in production, the
gateway's daily `whats-new` job turns it into a "Brand New Feature" News Feed
card plus a push to every tenant member, in their own language.

```
merge → staging → PUBLISH to prod → /whats-new.json (prod) → gateway job
        (16:00 UTC daily) → card + push, once per entry, oldest first, max 1/day
```

## You usually don't write the file — it is drafted for you (VTID-04739)

When a PR lands on `main`, `WHATS-NEW-DRAFT.yml` asks a Claude model (AWS
Bedrock) whether members would notice it. If yes, it opens a PR named
`What's New: <title> (VTID-…)` with a drafted EN/DE entry. **You review the
copy and merge it** (edit the file if the wording is off, close the PR to skip
the announcement). Nothing reaches members until that PR is merged *and* the
build is published to production.

- The source PR's title must carry a VTID (the entry PR reuses it for the
  staging gate). Docs, tests, CI, i18n-only and admin-only changes are skipped
  without a model call.
- Add an entry by hand when the drafter cannot see the change, or to override
  its wording; a PR that already adds an entry is never drafted for.
- Inert until the repo secret `WHATS_NEW_BEDROCK_ROLE_ARN` exists
  (`scripts/whats-new/setup-bedrock-role.sh`). Try it on any merged PR without
  side effects: `gh workflow run WHATS-NEW-DRAFT.yml -f pr_number=<n> -f dry_run=true`
  (the draft appears in the job summary; nothing is opened).

## Add an entry

`src/whats-new/entries/<id>.json` — the file name must equal `id`:

```json
{
  "id": "profile-redesign",
  "added": "2026-09-29",
  "title":       { "en": "Your Profile, Reimagined", "de": "Dein Profil, neu gedacht" },
  "description": { "en": "…one or two sentences…",   "de": "…du-Form…" },
  "deepLink": "/me/profile"
}
```

- `en` and `de` are required (DE in du-form); other gateway locales optional
  (`es sr fr pt ru pl zh ar tr`) — missing ones fall back to English.
- `title` ≤ 60 chars, `description` ≤ 220 chars — it is also the push body.
- `deepLink` is the card's "Try it yourself" target: a real in-app **path**
  (no query/hash) known to `navigation/registry` (screens or exclusions).
- Write for a member, not an engineer: what they can now do, not what changed.

## When to add one

New feature, a redesigned screen, a changed flow a member will notice.
**Skip** for fixes, refactors, admin/dev-only work, and anything invisible.
If in doubt whether a member would care, they probably wouldn't.

## Guard rails (gateway side)

- Entries older than 14 days (by `added`) are never published — a late deploy
  can't flood members with stale news.
- One card per day at most; a backlog drains oldest-first over following days.
- Each `id` is published once per tenant (recorded on the announcement row).
- Kill switch: `WHATS_NEW_AUTOPUBLISH=false` on the gateway.
- Build fails on a malformed entry (`npm run whats-new` to check locally).
