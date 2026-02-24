

## Add Search Bar to Mobile Side Drawer

### What We're Building
A search input inside the mobile side drawer navigation, positioned between the blue header and the first nav item (Events & MeetUps). It will match the desktop sidebar's search style -- a rounded input with a search icon, placeholder "Search members, groups, or..." -- and navigate to the `/search` page with the query when the user submits.

### Changes

**File: `src/components/mobile/SideDrawerNav.tsx`**

1. Import `Search` from lucide-react, `Input` from ui/input, and add local state for the search query.

2. Add a search bar section between the header (`</div>` at line 100) and the nav items list (`<div className="flex-1 overflow-y-auto ...">` at line 103). The search bar will be a self-contained `<div>` with:
   - Horizontal padding matching the nav items (`px-4`)
   - Vertical padding (`py-3`) with a subtle bottom border for separation
   - A relative container with a `Search` icon absolutely positioned left, and an `Input` with `pl-9` padding
   - Styling: `bg-muted/40 border-border rounded-xl` to match the dark-mode desktop sidebar aesthetic while working in light mode too

3. On `Enter` key or submit: close the drawer, navigate to `/search?q=${query}`, and clear local state. This reuses the existing `/search` page which already handles the full search experience.

### Technical Details

```tsx
// New state in SideDrawerNav
const [searchQuery, setSearchQuery] = useState('');

// New JSX between header and nav items
<div className="px-4 py-3 border-b border-border/50">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Search members, groups, or..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
          onClose();
          navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
          setSearchQuery('');
        }
      }}
      className="pl-9 h-9 text-sm rounded-xl bg-muted/40 border-border"
    />
  </div>
</div>
```

No new components or files needed. The search input delegates to the existing `/search` page, keeping the drawer simple and focused on navigation.

