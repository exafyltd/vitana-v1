
## What’s happening (two separate issues)

### 1) “View all media / View all groups / Discover groups” still English
These strings are hardcoded in:
- `src/components/profile/mobile/MobileMediaTabContent.tsx`
- `src/components/profile/mobile/MobileGroupsTabContent.tsx`

They do not use `useTranslation()` at all, so they will always render in English regardless of the selected language.

### 2) “Publishing failed” build error
Your build log shows:

- `failed to acquire sandbox config`
- `scheduler timeout: retry deadline exceeded`
- marked as `retryable: true`

That is an infrastructure/scheduler timeout (Lovable build sandbox capacity), not a TypeScript/React compile error caused by your code change. There is nothing to “fix in code” for that specific error; the resolution is operational (retry).

---

## Goals
1) Remove hardcoded English strings from the mobile Profile “Media” and “Groups” tab content, so German shows correctly.
2) Provide a reliable step-by-step path to get publishing to succeed again.

---

## Implementation plan (code)

### Step A — Add translation keys (DE + EN)
Add a small dedicated namespace for these mobile profile tab CTAs and empty states (keeping it consistent and avoiding reuse collisions):

Proposed keys:

**`profileMedia.*`**
- `profileMedia.emptyTitle` → DE: “Noch keine Medien” | EN: “No media yet”
- `profileMedia.emptyDescription` → DE: “Teile deine Wellness-Reise” | EN: “Share your wellness journey”
- `profileMedia.uploadCta` → DE: “Medien hochladen” | EN: “Upload media”
- `profileMedia.viewAllCta` → DE: “Alle Medien ansehen” | EN: “View all media”
- `profileMedia.thumbnailAlt` → DE: “Medien” | EN: “Media” (fallback alt text)

**`profileGroups.*`**
- `profileGroups.emptyTitle` → DE: “Noch keine Gruppen” | EN: “No groups yet”
- `profileGroups.emptyDescription` → DE: “Tritt Communities bei, die zu deinen Interessen passen” | EN: “Join communities that match your interests”
- `profileGroups.discoverCta` → DE: “Gruppen entdecken” | EN: “Discover groups”
- `profileGroups.viewAllCta` → DE: “Alle Gruppen ansehen” | EN: “View all groups”
- `profileGroups.membersLabel` → DE: “Mitglieder” | EN: “members” (used after the number)

Files:
- `src/i18n/de.json`
- `src/i18n/en.json`

### Step B — Localize `MobileMediaTabContent.tsx`
Update the component to:
- `import { useTranslation } from "@/hooks/useTranslation";`
- Use `translate()` for:
  - Empty-state title/description
  - Upload button label
  - “View all media” CTA
  - Thumbnail `alt` fallback (`item.title || translate('profileMedia.thumbnailAlt', 'Media')`)

Also keep existing placeholder `title` values as-is (those are demo content; we won’t auto-translate demo titles unless you want that later).

File:
- `src/components/profile/mobile/MobileMediaTabContent.tsx`

### Step C — Localize `MobileGroupsTabContent.tsx`
Update the component to:
- `import { useTranslation } from "@/hooks/useTranslation";`
- Use `translate()` for:
  - Empty-state title/description
  - Empty-state “Discover Groups” button label
  - “View all groups” CTA
  - “Discover groups” CTA
  - Members line: `"{count} {translate('profileGroups.membersLabel', 'members')}"`

File:
- `src/components/profile/mobile/MobileGroupsTabContent.tsx`

### Step D — Quick verification steps (in preview)
1) Switch language to German
2) Go to the mobile Profile screen
3) Open “Media” tab: confirm the CTA reads in German
4) Open “Groups” tab: confirm both CTAs read in German
5) Toggle back to English and confirm it flips back correctly

---

## Publishing plan (non-code, resolves your current build error)

Because the error is a **retryable scheduler timeout**, do this:

1) Wait 2–5 minutes (scheduler capacity often clears quickly)
2) Click **Publish** again
3) If it still fails, try again after ~10 minutes (peak load can cause repeated timeouts)
4) If it persists for >30 minutes, share the timestamp and I’ll guide you to collect the exact publish attempt ID / logs so support can see the scheduler incidents

Important: this error message does **not** indicate a TS/ESLint build failure—so the localization changes above are still valid and should publish once the scheduler is available.

---

## Scope note (related but not included unless you want it next)
`src/pages/community/MyGroups.tsx` contains a large amount of hardcoded English (headers, buttons, empty states, etc.). If you want, we can do a follow-up sweep to fully localize that page too, but the fixes above directly address what you reported on the Profile “Media” and “Groups” tabs.

---

## Acceptance criteria
- German selected:
  - “View all media” → German
  - “View all groups” / “Discover groups” → German
  - Empty states (“No media yet”, “No groups yet”, etc.) → German
- English selected:
  - Same strings show in English
- Publish succeeds once Lovable scheduler is available (no code changes required specifically for the timeout)
