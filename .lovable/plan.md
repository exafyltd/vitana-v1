

# Translate "Create" Buttons in Utility Action Bars

## Problem

The "Create" action button in the utility action bar displays in English even when German is selected. This occurs in 3 files:

| File | Current Code | Should Be |
|------|--------------|-----------|
| `BusinessHub.tsx` | `<span>Create</span>` | `{translate('buttons.create')}` |
| `Groups.tsx` | `<span>Create</span>` | `{translate('buttons.create')}` |
| `EventsAndMeetups.tsx` | `<span>Create</span>` | `{translate('buttons.create')}` |

## Solution

The translation key already exists:
- **German** (`de.json`): `"buttons.create": "Erstellen"`
- **English** (`en.json`): `"buttons.create": "Create"`

Simply replace the hardcoded strings with the `translate()` function call.

---

## Files to Modify

### 1. `src/pages/BusinessHub.tsx`
**Line 179** — Replace hardcoded "Create":
```typescript
// Before
<span className="text-sm">Create</span>

// After
<span className="text-sm">{translate('buttons.create', 'Create')}</span>
```

### 2. `src/pages/community/Groups.tsx`
**Line 55** — Replace hardcoded "Create":
```typescript
// Before
{!isMobile && <span>Create</span>}

// After
{!isMobile && <span>{translate('buttons.create', 'Create')}</span>}
```

**Note**: This file needs to import `useTranslation` if not already present.

### 3. `src/pages/community/EventsAndMeetups.tsx`
**Line 698** — Replace hardcoded "Create":
```typescript
// Before
<span className="text-sm">Create</span>

// After
<span className="text-sm">{translate('buttons.create', 'Create')}</span>
```

---

## Acceptance Criteria

- [ ] BusinessHub "Create" button shows "Erstellen" when German is selected
- [ ] Groups page "Create" button shows "Erstellen" when German is selected
- [ ] Events & Meetups "Create" button shows "Erstellen" when German is selected
- [ ] All three buttons continue to show "Create" when English is selected

