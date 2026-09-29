# What's New — automatic "Brand New Feature" cards (VTID-04733)

Every user-facing addition or redesign ships with **one file** in `entries/`.
Nothing else is needed: once the build carrying it is live in production, the
gateway's daily `whats-new` job turns it into a "Brand New Feature" News Feed
card plus a push to every tenant member, in their own language.

```
merge → staging → PUBLISH to prod → /whats-new.json (prod) → gateway job
        (16:00 UTC daily) → card + push, once per entry, oldest first, max 1/day
```

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
