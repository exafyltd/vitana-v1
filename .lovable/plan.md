

## Add "Daily Diary" as a sidebar nav item + create a mobile-optimized diary page

### What this does
Adds a new "Daily Diary" entry in the mobile sidebar drawer (between Health and Connectors), pointing to a new mobile-optimized page at `/daily-diary`. This page follows the same compressed mobile layout patterns used by Events, Live Rooms, Media Hub, etc. — full viewport height, compact header, scrollable pill tabs for entry modes, and the feedback section at the bottom.

### Changes

**1. Add nav item to drawer config**
- `src/config/drawer-nav.config.ts`: Import `BookOpen` icon, add `{ id: 'diary', route: '/daily-diary', icon: BookOpen, translationKey: 'drawerNav.diary' }` between `health` and `connectors`.

**2. Add translations**
- `src/i18n/en.json`: Add `"diary": "Daily Diary"` to `drawerNav` section.
- `src/i18n/de.json`: Add `"diary": "Tägliches Tagebuch"` to `drawerNav` section.

**3. Create the mobile diary page: `src/pages/MobileDailyDiary.tsx`**

Layout follows mobile hub pattern:
- Outer container: `px-2 pt-2 pb-0 h-[100dvh] overflow-hidden` with gradient background.
- Compact header: title "Daily Diary" with 📔 emoji, compressed padding (`pt-2 pb-1`).
- Horizontal scrollable pill tabs (3 tabs): 🎤 Voice, 📸 Photo, ✍️ Text.
- Each tab shows the respective recorder/uploader component (VoiceDiaryRecorder, PhotoDiaryUploader, TextDiaryEditor) in a compact card, followed by the entry list (DiaryEntryList).
- Below the tab content, a collapsible "Test Feedback" section with FeedbackRecorder and FeedbackReportList (same red/orange gradient card).
- The whole content area scrolls vertically within the viewport-height container (overflow-y-auto with bottom padding `pb-[120px]` for safe area + bottom nav clearance).
- Uses `useIsMobile()` — if accessed on desktop, redirects to `/memory/diary`.

**4. Add route in `src/App.tsx`**
- Import `MobileDailyDiary` and add route: `<Route path="/daily-diary" element={<AuthGuard><MobileDailyDiary /></AuthGuard>} />`.

### Technical details
- Reuses existing components: `VoiceDiaryRecorder`, `PhotoDiaryUploader`, `TextDiaryEditor`, `DiaryEntryList`, `FeedbackRecorder`, `FeedbackReportList`.
- No new DB tables or migrations needed.
- Mobile-only page; desktop users are redirected to the existing `/memory/diary` route.
- Follows the "one decision layer" navigation compression rule — tabs are page-internal, not a second nav bar.
- Photo gallery/carousel modal support carried over for the photo tab.

