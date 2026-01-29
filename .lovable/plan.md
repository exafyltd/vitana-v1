

## Update Inbox Title Translation: "Posteingang" → "Postfach"

### Change Summary

Update the German translation for the Inbox title from "Posteingang" to "Postfach" as requested.

### Files to Modify

| File | Line | Current Value | New Value |
|------|------|---------------|-----------|
| `src/i18n/de.json` | 544 | `"inbox": "Posteingang"` | `"inbox": "Postfach"` |
| `src/i18n/de.json` | 858 | `"title": "Posteingang"` | `"title": "Postfach"` |

### Implementation

Two occurrences need to be updated:

1. **Sidebar/Navigation label** (line 544):
   - Used for bottom nav and sidebar menu items
   
2. **Page title** (line 858):
   - Used in the `StandardHeader` on the Messages page

Both will be changed to "Postfach" for consistency.

### Verification

After the change:
- Navigate to Inbox/Messages page in German
- Title should show "Postfach" instead of "Posteingang"
- Bottom navigation should also show "Postfach"

