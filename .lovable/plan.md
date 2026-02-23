
## Profile Enhancement: Milestones, Messaging, Photo Gallery, and Public Share Landing

This plan adds four major features to the profile: life milestones, direct messaging from profile, a personal photo gallery, and a beautiful public profile landing page for shared links. All features are fully responsive for mobile.

---

### Feature 1: Life Milestones

A section on the profile where users can record life-changing experiences/events that define who they are -- displayed as a timeline of personal milestones.

**Database changes:**
- Create `profile_milestones` table with columns: `id (uuid)`, `user_id (uuid, not null)`, `title (text, not null)`, `description (text)`, `milestone_date (date)`, `icon (text)` (emoji), `is_public (boolean, default true)`, `sort_order (int)`, `created_at`, `updated_at`
- RLS policies: owner can CRUD, public can SELECT where `is_public = true`

**New files:**
- `src/hooks/useProfileMilestones.ts` -- CRUD hook for milestones (Supabase queries + React Query)
- `src/components/profile/milestones/MilestoneTimeline.tsx` -- Visual timeline component showing milestones as cards along a vertical line with emoji icons, dates, and descriptions. Glassmorphism styling matching the profile aesthetic
- `src/components/profile/milestones/MilestoneEditor.tsx` -- Dialog/drawer for adding/editing a milestone (title, description, date, emoji picker, public toggle)

**Modified files:**
- `src/types/profile.ts` -- Add `Milestone` interface
- `src/components/profile/shared/ProfileSplitNavigation.tsx` -- Add Milestones section in the left "About" column, below the bio
- `src/components/profile/shared/ProfileLayout.tsx` -- Pass milestone editing callbacks; render MilestoneTimeline on mobile about tab
- `src/i18n/en.json` / `de.json` -- Add `milestones.*` translation keys

---

### Feature 2: Send Message from Profile

The messaging infrastructure already exists (`MessageComposeModal`, `useHybridMessages`, thread creation). Currently only accessible from the ID card front. This will make it more prominent.

**Modified files:**
- `src/components/profile/shared/ProfileSplitNavigation.tsx` -- Add a "Send Message" button in the left column when viewing someone else's profile (not own profile). Reuse existing `MessageComposeModal` and `useHybridMessages`
- `src/components/profile/shared/ProfileLayout.tsx` -- On mobile, add a floating "Message" FAB button when viewing another user's profile
- `src/components/profile/mobile/MobileIdentityCard.tsx` -- Add a subtle message icon button next to the follow button

---

### Feature 3: Photo Gallery

A personal photo catalog where users can upload and showcase their pictures on the Media tab.

**Database changes:**
- Create `profile_gallery` table: `id (uuid)`, `user_id (uuid, not null)`, `image_url (text, not null)`, `caption (text)`, `sort_order (int)`, `is_public (boolean, default true)`, `created_at`
- RLS: owner CRUD, public SELECT where `is_public = true`
- Storage: use existing `media-uploads` bucket (already public)

**New files:**
- `src/hooks/useProfileGallery.ts` -- CRUD hook: upload to `media-uploads` bucket, insert/delete gallery rows
- `src/components/profile/gallery/PhotoGallery.tsx` -- Masonry/grid display of photos with lightbox on tap. Upload button for owner. Captions on hover/tap
- `src/components/profile/gallery/PhotoUploadDialog.tsx` -- Upload dialog with drag-and-drop, caption input, public toggle. Accepts JPEG, PNG, WebP (not HEIC per existing restriction)
- `src/components/profile/gallery/PhotoLightbox.tsx` -- Full-screen image viewer with swipe navigation on mobile

**Modified files:**
- `src/components/profile/shared/tabs/ProfileMediaTab.tsx` -- Replace mock data section with a real "My Photos" gallery section at the top, followed by existing media content
- `src/components/profile/mobile/MobileMediaTabContent.tsx` -- Add photo gallery grid for mobile with upload FAB

---

### Feature 4: Profile Sharing with Public Landing Page

When someone shares their profile link and the recipient clicks it, they should see a beautiful, immersive overview -- not just the standard profile page.

**Approach:** Enhance the existing `PublicProfilePage.tsx` (route `/u/:identifier`) to render a polished, share-optimized landing view. This includes:

**New files:**
- `src/components/profile/public/PublicProfileLanding.tsx` -- A standalone, beautifully designed profile overview page with:
  - Hero section with cover image, avatar, name, handle, Vitana Index orb
  - Bio and location
  - Milestone highlights (top 3 milestones)
  - Photo gallery preview (top 6 photos in a grid)
  - Stats strip (followers, posts, etc.)
  - Social links row
  - CTA buttons: "Follow", "Send Message", "View Full Profile" (requires auth)
  - All wrapped in glassmorphism design matching the app aesthetic
  - Fully responsive -- on mobile it's a full-screen immersive scroll

**Modified files:**
- `src/pages/PublicProfilePage.tsx` -- When accessed with `?utm_source=profile` (shared link) or without authentication, render `PublicProfileLanding` instead of the full `ProfileLayout`. Fetch milestones and gallery photos alongside the profile data
- `src/hooks/useProfileShare.ts` -- Ensure the share URL uses UTM parameters already implemented
- `src/components/profile/shared/ShareProfileModal.tsx` -- Add WhatsApp share option (already in `ProfileShareSheet` but missing from `ShareProfileModal`)
- `src/components/SEO.tsx` -- Enhance OG meta tags for profile sharing (og:image using avatar, og:description using bio)

---

### i18n Support

All new UI strings get keys in both `en.json` and `de.json`:

| Key | English | German |
|-----|---------|--------|
| `milestones.title` | Life Milestones | Lebensmeilensteine |
| `milestones.add` | Add Milestone | Meilenstein hinzufugen |
| `milestones.empty` | No milestones yet | Noch keine Meilensteine |
| `milestones.date` | Date | Datum |
| `milestones.description` | What happened? | Was ist passiert? |
| `gallery.title` | Photo Gallery | Fotogalerie |
| `gallery.upload` | Upload Photo | Foto hochladen |
| `gallery.caption` | Caption | Beschriftung |
| `gallery.empty` | No photos yet | Noch keine Fotos |
| `publicProfile.viewFull` | View Full Profile | Vollstandiges Profil ansehen |
| `publicProfile.sendMessage` | Send Message | Nachricht senden |
| `publicProfile.milestones` | Life Milestones | Lebensmeilensteine |

---

### Implementation Order

1. Database migrations (milestones + gallery tables with RLS)
2. Hooks (`useProfileMilestones`, `useProfileGallery`)
3. Milestone components (Timeline + Editor)
4. Photo Gallery components (Gallery + Upload + Lightbox)
5. Integrate milestones and gallery into ProfileLayout / ProfileSplitNavigation / mobile tabs
6. Message button enhancements
7. Public profile landing page
8. Share modal improvements (WhatsApp, OG tags)
9. i18n keys for EN + DE
