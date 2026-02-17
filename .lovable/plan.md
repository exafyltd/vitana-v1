

## Fix: "Highlight my Profile" and "Style my Profile" Show Error

### Problem

The `autopilot-profile` edge function only handles two options: `polish-bio` and `refresh-archetype`. When the user selects `highlight-showcase` or `style-profile`, the function returns `{ bio: null, archetype: null }`. The preview step then has no suggestions to display and falls into the empty-state branch, which shows the generic error message "Etwas ist schiefgelaufen".

### Solution

Since these two features are not yet implemented on the backend, the cleanest fix is to mark them as "Coming Soon" in the UI so users know they are not yet available, rather than letting them trigger an error.

### Changes

**File: `src/components/profile/AutopilotProfilePopup.tsx`**

1. Add a `comingSoon` flag to the two unimplemented options in the `suggestionConfigs` array.

2. In the selection UI, render "Coming Soon" options as visually disabled (grayed out, not clickable, with a small "Coming Soon" badge).

3. Prevent these options from being toggled into `selectedSuggestions`.

This way:
- Users see all four options but understand two are not yet available
- Only `polish-bio` and `refresh-archetype` can be selected and sent to the edge function
- No more false error messages

### Technical Detail

```tsx
// Add comingSoon to the interface
interface SuggestionOption {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: typeof User;
  comingSoon?: boolean;
}

// Mark the two unimplemented options
{
  id: "highlight-showcase",
  ...
  comingSoon: true,
},
{
  id: "style-profile",
  ...
  comingSoon: true,
},
```

In the card rendering, when `comingSoon` is true:
- Add `opacity-50 cursor-not-allowed` styling
- Skip the toggle on click
- Show a small "Coming Soon" / "Bald verfuegbar" badge next to the title
- Disable the checkbox

### Translation Keys

Add new key: `autopilot.profilePopup.comingSoon` with values:
- EN: "Coming Soon"
- DE: "Bald verfuegbar"

### Files Changed

| File | Change |
|------|--------|
| `src/components/profile/AutopilotProfilePopup.tsx` | Add `comingSoon` flag to config, disable unimplemented options in UI |
| Translation file(s) | Add `autopilot.profilePopup.comingSoon` key |

