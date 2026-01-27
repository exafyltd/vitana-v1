

# Auto-Switch "Meet Vitanaland Citizens" to Demo Data Unless Profiles Are Rich

## Problem Summary
The user still sees sparse test accounts in the "Meet Vitanaland Citizens" section on the desktop Home page. The previous fix only addressed the "Discover People" section in `Community.tsx` - but the Home page has a separate component (`PeopleDiscoveryHero`) that still prioritizes real profiles from the database.

## Solution
Update `PeopleDiscoveryHero.tsx` to only use real profiles when they meet richness criteria. Otherwise, fall back to the rich demo profiles.

**Richness criteria (all must be present):**
- Has avatar (`avatar_url` is not null/empty)
- Has bio (40+ characters)
- Has headline (`professional_headline` is not null/empty)
- Has interests (`top_3_interests` array has at least 1 item)

## Technical Implementation

### File: `src/components/discovery/PeopleDiscoveryHero.tsx`

**Current Code (lines 224-246):**
```typescript
const displayProfiles = useMemo(() => {
  let baseProfiles = profiles && profiles.length > 0 
    ? profiles 
    : demoProfiles.map(p => ({...}));
  // ...filters
  return baseProfiles;
}, [profiles, demoProfiles, interestFilter, regionFilter]);
```

**Updated Code:**
```typescript
const displayProfiles = useMemo(() => {
  // Check if real profiles are "rich enough" to display
  const isProfileRich = (p: MatchProfile) => 
    !!p.avatar_url && 
    (p.bio?.length || 0) >= 40 && 
    !!p.professional_headline && 
    (p.top_3_interests?.length || 0) > 0;

  // Only use real profiles if at least half are rich
  const richProfiles = profiles?.filter(isProfileRich) || [];
  const useRealProfiles = richProfiles.length >= Math.ceil((profiles?.length || 0) / 2);

  let baseProfiles = useRealProfiles && richProfiles.length > 0
    ? richProfiles
    : demoProfiles.map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        age: p.age,
        avatar_url: p.avatar_url,
        bio: p.bio,
        location: p.location,
        professional_headline: p.professional_headline,
        story_cue: p.story_cue,
        vitana_index: p.vitana_index,
        vitana_percentile: p.vitana_percentile,
        activity_time_preference: p.activity_time_preference,
        top_3_interests: p.top_3_interests,
        certification_badges: p.certification_badges,
        match_score: p.compatibility_score,
        match_reasons: [p.match_reason],
        shared_interests: p.shared_interests,
        streak_days: p.streak_days,
        primary_pillar: p.primary_pillar,
      }));

  // Apply filters
  if (interestFilter !== "all") {
    baseProfiles = baseProfiles.filter(p => 
      p.top_3_interests?.some(i => i.toLowerCase().includes(interestFilter.toLowerCase()))
    );
  }
  if (regionFilter !== "all") {
    baseProfiles = baseProfiles.filter(p => 
      p.location?.toLowerCase()?.includes(regionFilter.toLowerCase()) ?? false
    );
  }

  return baseProfiles;
}, [profiles, demoProfiles, interestFilter, regionFilter]);
```

## How It Works

| Scenario | Result |
|----------|--------|
| No real profiles in DB | Demo profiles shown |
| Real profiles exist but are sparse | Demo profiles shown |
| 50%+ of real profiles are rich | Rich real profiles shown |
| User populates rich profiles | Auto-switches to real data |

## Richness Check Function

```text
isProfileRich(profile) =
  ✓ has avatar_url (non-null, non-empty)
  ✓ has bio >= 40 characters
  ✓ has professional_headline (non-null, non-empty)
  ✓ has at least 1 item in top_3_interests
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/discovery/PeopleDiscoveryHero.tsx` | Add richness check logic before selecting data source |

## Benefits

- Automatic: No manual toggle needed
- Progressive: Switches to real data as community grows
- Consistent UX: Users always see rich, engaging profiles
- Easy criteria: Clear signals for what counts as "complete"

