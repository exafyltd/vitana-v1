

## Enhance Share Profile Social Section with Connected Networks

### Current State
The `ShareProfileModal` hardcodes exactly 3 social platforms (LinkedIn, X, Facebook) with no awareness of which platforms the user has connected. The `onShareToFacebook` is even passed as `() => {}` (no-op) in most places. There's no support for Instagram, TikTok, or YouTube sharing.

### Goal
Show the user's **connected** social networks first (highlighted), followed by unconnected ones. Support all 6 profile platforms: LinkedIn, X, Facebook, Instagram, TikTok, YouTube.

### Social Share URL Capabilities
- **LinkedIn**: `https://www.linkedin.com/sharing/share-offsite/?url=` (direct web share)
- **X/Twitter**: `https://twitter.com/intent/tweet?text=&url=` (direct web share)
- **Facebook**: `https://www.facebook.com/sharer/sharer.php?u=` (direct web share)
- **Instagram**: No web share URL — copies link to clipboard with toast guidance ("Link copied! Paste it in your Instagram story or post")
- **TikTok**: No web share URL — copies link to clipboard with toast guidance
- **YouTube**: No web share URL — copies link to clipboard with toast guidance

### Changes

**1. `src/hooks/useProfileShare.ts`** — Add missing share functions
- Add `shareToFacebook` (Facebook sharer URL)
- Add `shareToInstagram` (copy link + toast with Instagram-specific guidance)
- Add `shareToTikTok` (copy link + toast with TikTok-specific guidance)  
- Add `shareToYouTube` (copy link + toast with YouTube-specific guidance)
- Export all new functions from the hook

**2. `src/components/profile/shared/ShareProfileModal.tsx`** — Major update
- Add a new `connectedPlatforms` prop: `{ linkedin?: boolean; instagram?: boolean; facebook?: boolean; x?: boolean; youtube?: boolean; tiktok?: boolean }`
- Add handler props for all 6 platforms
- Render a **two-row grid**: connected platforms first (with a green checkmark/dot indicator), then unconnected platforms below
- Each platform button shows its branded icon and name
- Section label stays "Share to social" but connected ones get a subtle accent border/background

**3. `src/pages/EditProfilePage.tsx`** — Pass connected platform info and new handlers
- Derive connected platforms from `profile` social URL fields (e.g., `!!profile.linkedin_url`)
- Pass all 6 share handlers and the `connectedPlatforms` object to `ShareProfileModal`

**4. `src/components/profile/shared/ProfileLayout.tsx`** — Same as above
- Pass connected platform info and all 6 handlers

**5. `src/components/profile/shared/ProfileIdCardFront.tsx`** — Same as above
- Pass connected platform info and all 6 handlers

### UI Layout (Share to Social section)

```text
┌─────────────────────────────────────┐
│ Share to social                     │
│                                     │
│ Connected:                          │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ in ✓ │ │ 𝕏 ✓ │ │ f ✓  │        │
│ │Linked│ │  X   │ │ FB   │        │
│ └──────┘ └──────┘ └──────┘        │
│                                     │
│ Also share to:                      │
│ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │  📸  │ │  🎵  │ │  ▶️  │        │
│ │Insta │ │TikTok│ │ YT   │        │
│ └──────┘ └──────┘ └──────┘        │
└─────────────────────────────────────┘
```

Connected platforms show with an accent border and checkmark. Unconnected platforms are styled as regular outline buttons. If no platforms are connected, all 6 show in a single grid under "Share to social".

### Translation
- Add German translations for new labels: "Also share to" → "Auch teilen auf", platform-specific copy-link toasts

Six files changed total (1 hook, 1 modal component, 3 parent components, 1 i18n file).

