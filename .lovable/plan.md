

## Add Search Dropdown to Events Search

When typing in the search field on the Events & MeetUps page, a dropdown will appear below the input showing matching events. Clicking an event in the dropdown navigates to it. This works on both desktop and mobile.

### Changes

**File 1: `src/components/ui/expandable-search-button.tsx`**

Add a new optional prop `dropdownItems` that accepts an array of search result objects (`{ id, title, subtitle?, imageUrl? }`), and a new `onItemClick` callback.

When `dropdownItems` is provided and the input has focus with a non-empty query:
- Render an absolutely-positioned dropdown below the search input (z-50, white bg, rounded, shadow, border, max-h-64 with overflow-y-auto)
- Each item shows the event title and optional subtitle (location or date) in a clickable row
- Clicking an item calls `onItemClick(id)` and collapses the search
- Dropdown closes on blur (with a small delay to allow click registration) or Escape key
- On mobile, the dropdown uses `fixed` or full-width positioning to avoid clipping by the utility bar's horizontal scroll

**File 2: `src/pages/community/EventsAndMeetups.tsx`**

- Create a `searchResults` memo that filters ALL `dbEvents` (not tab-scoped) by the search query, limited to 6 results
- Pass `dropdownItems` and `onItemClick` to `ExpandableSearchButton`:
  - `dropdownItems`: mapped from `searchResults` with `id`, `title`, `subtitle` (location or formatted date)
  - `onItemClick`: calls `handleCardClick` with the matching event (navigates to event detail or opens drawer)
- Existing inline grid filtering remains as-is (the dropdown is an addition, not a replacement)

### Technical Details

```text
+---------------------------+
| Search input: "sunset"    |
+---------------------------+
| Sunset Yoga by the Sea    |  <-- clickable row
|   Cala Major Beach        |
|---------------------------|
| Detox Sunset Dinner       |
|   Vineyard Restaurant     |
|---------------------------|
| Maxina Sunset Networking  |
|   Beach Lounge, Palma     |
+---------------------------+
```

- The dropdown uses `onMouseDown` (not `onClick`) on items to fire before the input's `onBlur`
- A `ref` wrapper around the entire search component handles outside clicks to close the dropdown
- Results are capped at 6 items to keep the dropdown compact
- The existing grid filtering behavior is unchanged -- typing still filters the active tab's cards as before

