# Reviewer evidence for removed `_pending_review` flags (VTID-05761)

A `_pending_review` flag in a catalog marks a value that a human or reviewer has not checked yet. Removing a flag
accepts that value. This folder holds the reviewer's record for every value whose flag a PR removes. The checker
`scripts/i18n/check-pending-review-evidence.mjs` fails a PR that removes a flag without a passing record.

## Files

- One JSON file per reviewed value, named `<locale>__<catalog-stem>__<key_path>.json` (for example
  `fr__settingsNative__settingsNative.notifications.chat.json`). The checker does not read the name. It reads the
  fields, so the name only helps humans.
- Only `.json` files in this folder are checked. This README is not.
- Commit the records in the same PR that removes the flags. The checker reads them from the PR head commit, not from
  a working copy.

## Record format

```json
{
  "key_path": "settingsNative.notifications.chat",
  "catalog_file": "src/i18n/fr/settingsNative.json",
  "locale": "fr",
  "value": "<the exact value at key_path in the catalog at the PR head>",
  "verdict": "pass",
  "reviewer_model": "<model id that produced the verdict>",
  "timestamp": "<ISO-8601 date-time, UTC, e.g. 2026-11-12T10:00:00Z>",
  "prompt_sha256": "<64 lowercase hex characters: SHA-256 of the exact prompt bytes sent to the reviewer>"
}
```

| Field | Rule |
|---|---|
| `key_path` | Dot-joined path from the top of the catalog file. A key that contains a `.` cannot be recorded and fails the check. |
| `catalog_file` | Repo-relative path of the catalog file, `src/i18n/<locale>/<file>.json`. Required because two files of one locale can hold the same top-level key. |
| `locale` | The `<locale>` folder of `catalog_file`. |
| `value` | The JSON value at `key_path` in the PR head. It must equal the current value exactly. A change to the text makes old records stop matching, so the value is reviewed again. |
| `verdict` | `pass` or `reject`. |
| `reviewer_model` | Non-empty string. The checker does not verify which model it names. |
| `timestamp` | ISO-8601 date-time string. |
| `prompt_sha256` | SHA-256 hex of the prompt the reviewer was given. The checker checks the format only. |

## Which values a flag covers

- A flag with entries covers each value it names. `{"notifications": {"_pending_review": {"chat": true}}}` covers
  `notifications.chat`, with one record for that value.
- An empty flag, `{"notifications": {"_pending_review": {}}}`, names no value. It covers the whole object that holds
  it, so its record is for `notifications`, and `value` is that object (including its children). Any later change
  inside that object invalidates the record.
- A value whose key is absent at the PR head (for example, its file was deleted) is compared as `null`.

## What the checker requires

For each value covered by a flag that exists at the merge-base of `--base` and `--head` but not at `--head`:

1. A record exists with the same `catalog_file`, `locale`, `key_path` and an equal `value`.
2. The newest such record (by `timestamp`) has `verdict: "pass"`. If a `pass` and a `reject` share the newest timestamp, the check fails.

Every record in this folder must be well formed, even when it matches no flag. A malformed record fails the check.

## Who writes a record

A reviewer writes each record. The reviewer must not be the author of the value or of the PR, so authors never write
`pass` records for their own values. `prompt_sha256` must hash the exact prompt the reviewer received, so the record
can be tied back to what the reviewer saw.

## Running the checker

```sh
node scripts/i18n/check-pending-review-evidence.mjs [--base origin/main] [--head HEAD] [--review-dir docs/validation/VTID-05761/review]
```

Exit codes: `0` when every removed flag has a passing record, or none was removed. `1` when a removed flag lacks a
passing record, or a record is malformed. `2` for bad arguments or an unknown revision.

Tests: `node --test scripts/i18n/__tests__/*.test.mjs`.

## Scope

This folder checks that a reviewer accepted a value. It does not replace the lane review in `collaboration.md`. It
does not check translation quality, and it does not run in the vitana-v1 CI (wiring it into PR-GATE is a separate
change).
