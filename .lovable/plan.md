

# Fix Chat Message Ordering

## Single-line change

**File**: `src/hooks/useGlobalMessages.ts`
**Line 709**: Replace `const sorted = [...rawMessages].reverse();` with explicit timestamp sort.

```ts
// Before
const sorted = [...rawMessages].reverse();

// After
const sorted = [...rawMessages].sort((a, b) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
);
```

This ensures messages are always ordered chronologically regardless of API response order, fixing the issue where Vitana's responses could appear before the user's questions.

No other changes to the file.

