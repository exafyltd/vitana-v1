

# Keep Mock Data for "Discover People" Section on Desktop Community Page

## Problem Summary
The desktop Community page's "Discover People" section currently prioritizes real community members from the database. However, these are test accounts with minimal profile data, making the section look sparse compared to the richer mock data (`communityPeople`) which includes professional titles, detailed descriptions, and high-quality images.

## Solution
Change the data selection logic to **always use mock data** until the database is populated with real, rich profiles.

## Technical Implementation

### File: `src/pages/Community.tsx`

**Current Code (line 1189-1191):**
```typescript
const displayPeople = realCommunityPeople.length > 0 
  ? realCommunityPeople 
  : communityPeople;
```

**Updated Code:**
```typescript
// Always use mock data until real profiles are populated with rich data
const displayPeople = communityPeople;
```

This single-line change ensures:
- Mock profiles (Jovana T., Dr. Roberts, Mariia) are always displayed
- Rich descriptions, professional titles, and quality images remain visible
- Easy to revert once real users populate the community with complete profiles

## Mock Data Being Preserved

The `communityPeople` array includes:

| Name | Title | Description |
|------|-------|-------------|
| Jovana T. | Tech wellness enthusiast | 12 mutual groups, Digital Nomad |
| Dr. Roberts | Hydration Expert 🩺 | Leading wellness doctor, Challenge host |
| Mariia | Wellness Ambassador 🌸 | Community leader, Wellness Studio |

## Future Considerations

When ready to switch to real data, the logic can be updated to check for profile completeness:
```typescript
const displayPeople = realCommunityPeople.some(p => p.description?.length > 20)
  ? realCommunityPeople 
  : communityPeople;
```

This would only switch to real data once profiles have meaningful content.

