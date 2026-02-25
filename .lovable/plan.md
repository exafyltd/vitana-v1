

## Live Search Dropdown in Mobile Drawer

### What We're Building
As the user types in the drawer's search bar, a dropdown appears below the input showing matching community members (from `global_community_profiles`). Tapping a result navigates to that member's profile (`/u/{handle || user_id}`) and closes the drawer. Pressing Enter still navigates to the full `/search` page as a fallback.

### Changes

**File: `src/components/mobile/SideDrawerNav.tsx`**

1. **Add state and query logic**: Import `useEffect`/`useRef`. Add `results` state and a debounced Supabase query against `global_community_profiles` that fires when the search query is >= 2 characters. Query selects `user_id, display_name, avatar_url, handle` with `is_visible = true` and `ilike` on `display_name`, limited to 6 results.

2. **Render dropdown below input**: Inside the search `<form>`, after the `<Input>`, render a results list when `searchQuery.length >= 2 && results.length > 0`. The dropdown is positioned absolutely below the input (`top-full mt-1`), with `bg-background border rounded-xl shadow-lg z-50 overflow-hidden`. Each item shows an avatar (or initials fallback) and display name.

3. **Item interaction**: Use `onMouseDown` (not `onClick`) on items to preempt input blur. On tap, navigate to `/u/${handle || user_id}`, clear query, close drawer.

4. **Empty state**: When query >= 2 chars but results are empty and not loading, show "No members found" text.

5. **Dismiss**: Clear results when query is emptied or drawer closes.

### Technical Detail

```tsx
// New state
const [results, setResults] = useState<Array<{user_id: string; display_name: string | null; avatar_url: string | null; handle: string | null}>>([]);
const [searching, setSearching] = useState(false);

// Debounced search effect
useEffect(() => {
  if (searchQuery.trim().length < 2) { setResults([]); return; }
  const timeout = setTimeout(async () => {
    setSearching(true);
    const { data } = await supabase
      .from('global_community_profiles')
      .select('user_id, display_name, avatar_url, handle')
      .eq('is_visible', true)
      .ilike('display_name', `%${searchQuery.trim()}%`)
      .limit(6);
    setResults(data || []);
    setSearching(false);
  }, 300);
  return () => clearTimeout(timeout);
}, [searchQuery]);

// Dropdown JSX (inside form, after Input)
{searchQuery.trim().length >= 2 && (
  <div className="absolute left-0 right-0 top-full mt-1 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
    {results.map(r => (
      <button key={r.user_id} onMouseDown={() => { navigate(`/u/${r.handle || r.user_id}`); setSearchQuery(''); onClose(); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-sm">
        <Avatar .../>
        <span>{r.display_name || 'Unknown'}</span>
      </button>
    ))}
    {!searching && results.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">No members found</div>}
  </div>
)}
```

One file changed. No new files or dependencies needed.

