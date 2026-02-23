
## Add Follow and Message Buttons to Mobile Profile Card

When viewing another user's profile on mobile, only a "Share" button is visible. We need to add "Follow" and "Message" buttons that match the glassmorphism pill style already established on the card.

### Layout

The three buttons (Share, Follow, Message) will be placed in a horizontal row below the handle/archetype text and above the divider. This avoids cluttering the top corners and gives them proper prominence. The Share button moves from the top-left corner into this row for a cleaner layout when viewing other profiles. When viewing your own profile (editMode), the current layout remains unchanged.

### Changes

**1. `src/components/profile/mobile/MobileIdentityCard.tsx`**
- Add new props: `onFollow`, `onMessage`, `isFollowing`, `followLoading`, `isOwner` (default true)
- Import `UserPlus`, `UserCheck`, `MessageSquare` icons from lucide-react
- When `!isOwner`: render a row of three pill buttons (Share, Follow, Message) below the handle, using the same glassmorphism style (`bg-white/10 backdrop-blur-sm border border-white/20 rounded-full`)
- Follow button shows "Following" with a check icon when already following, "Follow" with plus icon otherwise
- Message button opens the compose modal
- Remove the top-left Share button when not owner (it moves into the row)

**2. `src/components/profile/mobile/MobileIdCardSwitcher.tsx`**
- Add new props: `onFollow`, `onMessage`, `isFollowing`, `followLoading`, `isOwner`
- Pass these through to `MobileIdentityCard`

**3. `src/components/profile/shared/ProfileLayout.tsx`**
- Import `useFollow`, `useHybridMessages`, `MessageComposeModal`, `useAuth`, `useState`
- Add `useFollow(profile.id)` hook call
- Add message modal state and handler (same pattern as `ProfileIdCardFront`)
- Pass `onFollow`, `onMessage`, `isFollowing`, `followLoading`, `isOwner` to `MobileIdCardSwitcher`
- Render `MessageComposeModal` in the mobile return path (conditionally, when not own profile)
- Determine `isOwner` from `scope === 'owner'` or `isOwnProfile`

### Button Design

All three buttons use the established mobile identity card pill style:
- `h-8 px-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium gap-1.5`
- Follow (active state): `bg-white/20 text-white` with UserCheck icon
- Arranged in a `flex gap-2 justify-center` row
