# i18n Audit — Arabic (ar)

Generated: 2026-05-27T07:46:45.837Z via **gemini**

## Summary

- **OK:** 69
- **EDIT_SUGGESTED:** 192
- **LOW_CONFIDENCE:** 0
- **Pass rate:** 26.4%
- **Threshold:** 10% flagged max

## Per-shard breakdown

| Shard | OK | Edit | Low | Total |
|---|---|---|---|---|
| auth.json | 3 | 1 | 0 | 4 |
| autopilot.json | 9 | 82 | 0 | 91 |
| discover.json | 9 | 51 | 0 | 60 |
| drawerNav.json | 3 | 13 | 0 | 16 |
| onboarding.json | 20 | 3 | 0 | 23 |
| sidebar.json | 12 | 34 | 0 | 46 |
| vitanaIndex.json | 13 | 8 | 0 | 21 |

## Sample of flagged keys

- `auth.json:auth.contactAdmin` — **EDIT_SUGGESTED** (1.00) — The term 'المدير' (manager/director) is less precise than 'المسؤول' (administrator) for 'administrator' in a technical context.
  - suggested: `يرجى الاتصال بالمسؤول للحصول على الوصول`
- `autopilot.json:autopilot.suggestions.bannerTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.bannerDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.enable` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.showcaseTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.showcaseBadge` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.showcaseDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.suggestPopular` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.recentHighlights` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.archetypeTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.archetypeBadge` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.archetypeDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.updateArchetype` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.profileSectionTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.profileSectionDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.suggestions.tryAutopilot` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.title` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.selectedOf` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.readyToExecute` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.executingTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.executingDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.complete` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.go` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.notNow` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.seeOptions` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.seeAllInAI` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.moreActions` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.toastExecutedTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.toastExecutedDesc` — **EDIT_SUGGESTED** (1.00) — target is not a string
- `autopilot.json:autopilot.popup.toastFailedTitle` — **EDIT_SUGGESTED** (1.00) — target is not a string