# What's New — automatic "Brand New Feature" cards (VTID-04733)

Every **brand-new, finished feature** a member can use ships with **one file** in `entries/`. Fixes, restyles and redesigns of existing screens, improvements, partial work and anything still being finished get **no** card (owner rule 2026-10-08).
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

A brand-new feature that is finished and that a member can use end to end.
**Skip** for fixes, restyles or redesigns of existing screens, reordering or
rewording, improvements to an existing feature, partial work (behind a flag,
"step 1 of N"), refactors, admin/dev-only work, and anything invisible.
If in doubt, skip: a missed card is cheap, a wrong one goes to every member.

## Holding an entry

To hold an entry back, move its file from `entries/` to `held/`
(`git mv src/whats-new/entries/<id>.json src/whats-new/held/<id>.json`). The
build only reads `entries/`, so a held entry is not in `/whats-new.json` and no
card is posted once the production build without it is live. To release it,
move it back. The `held/` folder is created on demand and disappears from git
when it is empty. The id must still equal the file name, and an entry whose
`added` is more than 14 days old when it is released is never published, so
update `added` when you release one. A card that was already published stays
published: holding cannot recall a card or a push.

## Guard rails (gateway side)

- Entries older than 14 days (by `added`) are never published — a late deploy
  can't flood members with stale news.
- One card per day at most; a backlog drains oldest-first over following days.
- Each `id` is published once per tenant (recorded on the announcement row).
- Kill switch: `WHATS_NEW_AUTOPUBLISH=false` on the gateway.
- Build fails on a malformed entry (`npm run whats-new` to check locally).
