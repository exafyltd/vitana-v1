
## Localize Media Hub Page

### Problem Summary

The Media Hub page (`src/pages/community/MediaHub.tsx`) has ~60+ hardcoded English strings despite translation keys already existing in `de.json` and `en.json`. The component imports `useTranslation()` (line 54) but uses it only sparingly. This includes:

- Page title "Media Hub" and description
- Tab labels "Shorts", "Music", "Podcasts" 
- Section headers "Trending Shorts", "Trending Music", "Latest Episodes", etc.
- Empty states and action buttons
- Upload popup (`UnifiedUploadModal.tsx`) - ~30+ hardcoded strings
- Delete confirmation dialogs
- Toast messages
- Search placeholder "Search Media..."
- Button text "+ Upload"

### Files to Modify

| File | Changes |
|------|---------|
| `src/i18n/de.json` | Expand `mediaHub` namespace with ~50 new keys |
| `src/i18n/en.json` | Mirror all new keys in English |
| `src/pages/community/MediaHub.tsx` | Replace all hardcoded strings with `translate()` calls |
| `src/components/community/UnifiedUploadModal.tsx` | Fully localize upload popup |

### Implementation Plan

#### Step 1: Expand Translation Keys

Add new keys under the existing `mediaHub` namespace:

**Page & Headers:**
- `mediaHub.pageTitle` / `pageDescription` 
- `mediaHub.discoverContent` ("Discover and share inspiring wellness content")

**Tabs (already exist, just need usage):**
- `mediaHub.tabs.shorts` / `.music` / `.podcasts` ✓ (already exist)

**Section Headers:**
- `mediaHub.sections.trendingShorts` ("Trending Shorts")
- `mediaHub.sections.trendingMusic` ("Trending Music") 
- `mediaHub.sections.musicPlaylists` ("Music Playlists")
- `mediaHub.sections.latestEpisodes` ("Latest Episodes")
- `mediaHub.sections.popularShows` ("Popular Shows")

**Actions:**
- `mediaHub.actions.upload` ("Upload")
- `mediaHub.actions.watchShorts` ("Watch Shorts")
- `mediaHub.actions.viewAllShorts` ("View all {count} shorts")
- `mediaHub.actions.playPlaylist` ("Play Playlist")
- `mediaHub.actions.clearFilters` ("Clear filters")
- `mediaHub.searchPlaceholder` ("Search Media...")

**Content Labels:**
- `mediaHub.shortsAvailable` ("{count} shorts available")
- `mediaHub.filteredBy` ("Filtered by:")
- `mediaHub.noMatchingShorts` ("No shorts match your interests")
- `mediaHub.viewAllShorts` ("View all shorts")
- `mediaHub.tracks` ("tracks")
- `mediaHub.min` ("min")
- `mediaHub.by` ("by")
- `mediaHub.episodes` ("episodes")
- `mediaHub.subscribers` ("subscribers")
- `mediaHub.unknownArtist` ("Unknown Artist")
- `mediaHub.unknownHost` ("Unknown Host")
- `mediaHub.latestActions` ("Latest Actions:")
- `mediaHub.moreActions` ("+{count} more actions")

**Popup Labels (Subscribe Button):**
- `mediaHub.subscribed` ("Subscribed")
- `mediaHub.subscribe` ("Subscribe")

**Dropdown Menu:**
- `mediaHub.menu.video` ("Video")
- `mediaHub.menu.music` ("Music")
- `mediaHub.menu.podcast` ("Podcast")
- `mediaHub.menu.singleUpload` ("Single Upload")
- `mediaHub.menu.bulkUpload` ("Bulk Upload")
- `mediaHub.menu.addToPlaylist` ("Add to Playlist")
- `mediaHub.menu.viewArtist` ("View Artist")

**Toasts:**
- `mediaHub.toast.linkCopied` / `linkCopiedDesc`
- `mediaHub.toast.filtersCleared` / `filtersClearedDesc`
- `mediaHub.toast.podcastDeleted` / `podcastDeletedDesc`
- `mediaHub.toast.videoDeleted` / `videoDeletedDesc`
- `mediaHub.toast.videoUpdated` / `videoUpdatedDesc`
- `mediaHub.toast.uploadSuccess` / `uploadSuccessDesc`
- `mediaHub.toast.deleteError` / `deleteErrorDesc`

**Delete Dialogs:**
- `mediaHub.deletePodcast.title` / `description` / `cancel` / `confirm`
- `mediaHub.deleteVideo.title` / `description` / `cancel` / `confirm`

#### Step 2: UnifiedUploadModal Localization

Add `mediaHub.upload.*` namespace:

- `mediaHub.upload.title` ("Upload Media")
- `mediaHub.upload.titleWithType` ("Upload {type}")
- `mediaHub.upload.mediaType` ("Media Type *")
- `mediaHub.upload.selectMediaType` ("Select media type")
- `mediaHub.upload.selectMediaTypeFirst` ("Select media type first")
- `mediaHub.upload.file` ("File *")
- `mediaHub.upload.clickToUpload` ("Click to upload")
- `mediaHub.upload.orDragDrop` ("or drag and drop")
- `mediaHub.upload.remove` ("Remove")
- `mediaHub.upload.title` ("Title *")
- `mediaHub.upload.titlePlaceholder` ("Enter title")
- `mediaHub.upload.description` ("Description")
- `mediaHub.upload.descriptionPlaceholder` ("Enter description")
- `mediaHub.upload.genre` / `mood` / `hostGuest` / `language` / `topic`
- `mediaHub.upload.tags` ("Tags")
- `mediaHub.upload.visibility` / `public` / `private`
- `mediaHub.upload.thumbnail` ("Custom Thumbnail (optional)")
- `mediaHub.upload.uploadThumbnail` ("Upload thumbnail")
- `mediaHub.upload.thumbnailHint` ("JPG, PNG, WebP (auto-generated if not provided)")
- `mediaHub.upload.uploading` ("Uploading... {progress}%")
- `mediaHub.upload.cancel` / `submit`

**Predefined Tags (keep stable IDs, translate display):**
- `mediaHub.upload.predefinedTags.*` for Nutrition, Sleep, Longevity, etc.

#### Step 3: Update MediaHub.tsx

1. Use the existing `translate()` from `useTranslation()`
2. Replace every hardcoded string with a `translate('mediaHub.*')` call
3. Update tab triggers to use translated labels
4. Update section headers, empty states, buttons, toasts
5. Use `useI18nNotify()` for toast messages

#### Step 4: Update UnifiedUploadModal.tsx

1. Import `useTranslation()`
2. Replace all form labels, placeholders, and button text
3. Keep PREDEFINED_TAGS as stable IDs, translate display names dynamically

### Technical Details

**Tab Triggers (current hardcoded):**
```tsx
// BEFORE
<SplitBarTrigger value="shorts">📹 Shorts</SplitBarTrigger>
<SplitBarTrigger value="music">🎵 Music</SplitBarTrigger>
<SplitBarTrigger value="podcasts">🎙️ Podcasts</SplitBarTrigger>

// AFTER
<SplitBarTrigger value="shorts">📹 {translate('mediaHub.tabs.shorts')}</SplitBarTrigger>
<SplitBarTrigger value="music">🎵 {translate('mediaHub.tabs.music')}</SplitBarTrigger>
<SplitBarTrigger value="podcasts">🎙️ {translate('mediaHub.tabs.podcasts')}</SplitBarTrigger>
```

**StandardHeader (current hardcoded):**
```tsx
// BEFORE
<StandardHeader
  title="Media Hub"
  description="Discover and share inspiring wellness content"
/>

// AFTER  
<StandardHeader
  title={translate('mediaHub.title')}
  description={translate('mediaHub.discoverContent')}
/>
```

**Upload Button (current hardcoded):**
```tsx
// BEFORE
<Button><Plus />Upload</Button>

// AFTER
<Button><Plus />{translate('mediaHub.actions.upload')}</Button>
```

### Translation Keys Summary (German)

| Key Path | German Value |
|----------|--------------|
| `mediaHub.discoverContent` | Entdecken und teilen Sie inspirierende Wellness-Inhalte |
| `mediaHub.sections.trendingShorts` | Trending Kurzvideos |
| `mediaHub.sections.trendingMusic` | Trending Musik |
| `mediaHub.sections.musicPlaylists` | Musik-Playlists |
| `mediaHub.sections.latestEpisodes` | Neueste Episoden |
| `mediaHub.sections.popularShows` | Beliebte Shows |
| `mediaHub.actions.upload` | Hochladen |
| `mediaHub.actions.watchShorts` | Kurzvideos ansehen |
| `mediaHub.searchPlaceholder` | Medien suchen... |
| `mediaHub.shortsAvailable` | {count} Kurzvideos verfügbar |
| `mediaHub.subscribed` | Abonniert |
| `mediaHub.subscribe` | Abonnieren |
| `mediaHub.unknownArtist` | Unbekannter Künstler |
| `mediaHub.upload.title` | Medien hochladen |
| `mediaHub.upload.file` | Datei * |
| `mediaHub.upload.clickToUpload` | Klicken zum Hochladen |
| ... and ~40 more keys |

### Verification Steps

1. Set language to German
2. Navigate to Community → Media Hub
3. Confirm the following are in German:
   - Page title ("Medien-Hub") and description
   - Tab labels (📹 Kurzvideos, 🎵 Musik, 🎙️ Podcasts)
   - Section headers (Trending Musik, Beliebte Shows, etc.)
   - "+ Hochladen" button
   - Search placeholder ("Medien suchen...")
4. Open the Upload popup - confirm German labels
5. Switch to English and verify it reverts
