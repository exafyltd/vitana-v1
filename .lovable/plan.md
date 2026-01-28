
# Keep "Events & MeetUps" Untranslated in German

## Summary
The user wants the "Events & MeetUps" title to remain in English even when German is selected, rather than being translated to "Veranstaltungen & Treffen".

## Current State
| Language | Current Title |
|----------|---------------|
| German | "Veranstaltungen & Treffen" |
| English | "Events & Meet-Ups" |

## Change Required

**File: `src/i18n/de.json` (line 20)**

Change:
```json
"title": "Veranstaltungen & Treffen"
```

To:
```json
"title": "Events & MeetUps"
```

## Result
| Language | New Title |
|----------|-----------|
| German | "Events & MeetUps" |
| English | "Events & Meet-Ups" |

Both languages will now display the English title, keeping the brand-consistent terminology across the app.
