

# Health Report Upload & Lab Order — Frontend Implementation Plan

## What Claude Is Handling (Backend)
Claude will run the Supabase migration: create `health_report_type` and `health_processing_status` enums, ALTER `lab_reports` to add 8 columns (`report_type`, `title`, `provider_name`, `file_path`, `file_size`, `mime_type`, `processing_status`, `ai_summary` — **no `file_url`**), create `health-reports` private storage bucket with folder-based RLS. Lovable waits for that migration to land before building.

## What Lovable Will Build (5 Steps)

### Step 2: `HealthReportUploadSheet.tsx`
New component: `src/components/health/mobile/HealthReportUploadSheet.tsx`

- Full-screen bottom `Sheet` (reuse existing `sheet.tsx` component)
- **Category pills**: horizontal scroll row — Blood Panel, Genomics, Metabolomics, Microbiome, Allergy, Cancer, Hormones, Imaging, Other — mapping 1:1 to `health_report_type` enum values
- **`defaultCategory` prop**: pre-selects category when opened from context (Medical tab → `blood_panel`, Omics tab → `genomics`)
- **File picker**: persistent `useRef<HTMLInputElement>` (per mobile reliability memory), accepts `.pdf,.jpg,.jpeg,.png,.heic`. On selection: materialize into `ArrayBuffer` → `Blob` (per `useMediaUpload.ts` pattern)
- **Optional fields**: Provider name (text input), Test date (date picker, default today)
- **Upload flow**:
  1. Upload blob to `health-reports` bucket at path `{user.id}/{report_type}/{Date.now()}_{sanitized_filename}`
  2. INSERT into `lab_reports` with shape from Claude's spec (tenant_id from `app_metadata.active_tenant_id`, `source: 'upload'`, `processing_status: 'uploaded'`)
  3. **No `file_url` stored** — signed URLs generated on demand
  4. Success toast, call `onUploadComplete()`, close sheet
- Props: `{ open, onOpenChange, onUploadComplete?, defaultCategory? }`

### Step 3: Wire into Health page
- **`Health.tsx`**: Add `uploadSheetOpen` + `orderSheetOpen` state, `uploadDefaultCategory` state. Render both sheets. Pass openers to `MobileHealthActionStrip` and `HealthMasterActionPopup`
- **`MobileHealthActionStrip.tsx`**: "Upload Blood Test" calls `onUploadOpen()` instead of `navigate()`. "Order Blood Test" calls `onOrderOpen()` instead of `navigate()`
- **`HealthMasterActionPopup.tsx`**: Accept `onUploadOpen` and `onOrderOpen` props. Wire "Upload Lab Results" and "Order Blood Test" cards to call these instead of navigating

### Step 4: MyBiology real data
- **`MyBiology.tsx`**: Replace `fetchResults()` with a `useQuery` that fetches from `lab_reports` directly (not through `lab_test_results` join). Show:
  - Type badge (color-coded per `report_type`)
  - Provider name + report date
  - Processing status badge (gray=uploaded, yellow=processing, green=parsed, red=failed)
  - Tap to view: calls `supabase.storage.from('health-reports').createSignedUrl(report.file_path, 3600)` **on demand only** — opens in new tab
- "Upload PDF" button on Medical tab opens `HealthReportUploadSheet` with `defaultCategory='blood_panel'`. Omics tab opens with `defaultCategory='genomics'`
- **Empty state**: Category icons with motivational text ("Upload your first blood panel to start building your health profile")
- Keep `lab_test_results` join as secondary data source for ordered test results (separate from uploaded reports)

### Step 5: `QuickLabOrderSheet.tsx`
New component: `src/components/health/mobile/QuickLabOrderSheet.tsx`

- Full-screen bottom `Sheet` with 4 curated tests:
  - Complete Blood Panel, Metabolic Health Panel, Hormones Panel, Allergy Panel
  - Each row: name, short description, "Order" button → navigates to `/health/services-hub`
- "Browse All Tests" link at bottom
- Wire into `MobileHealthActionStrip` and `HealthMasterActionPopup`

## Files Summary

| Action | File |
|--------|------|
| **New** | `src/components/health/mobile/HealthReportUploadSheet.tsx` |
| **New** | `src/components/health/mobile/QuickLabOrderSheet.tsx` |
| **Modify** | `src/pages/Health.tsx` — add sheet states + render |
| **Modify** | `src/components/health/mobile/MobileHealthActionStrip.tsx` — open sheets instead of navigate |
| **Modify** | `src/components/HealthMasterActionPopup.tsx` — accept + call sheet openers |
| **Modify** | `src/pages/health/MyBiology.tsx` — real data from `lab_reports`, on-demand signed URLs, empty states |

## Key Technical Details

- **Tenant ID**: `user.app_metadata?.active_tenant_id` (consistent with existing codebase pattern, e.g. `useMessages.ts`)
- **No `file_url` column**: Only `file_path` stored. Signed URLs generated on demand via `createSignedUrl(file_path, 3600)`
- **`source: 'upload'`**: Distinguishes user uploads from API-ingested data in existing `source` column
- **Mobile upload reliability**: `useRef<HTMLInputElement>` for file input, `ArrayBuffer` → `Blob` materialization, explicit `contentType`, `await` full upload before state reset
- **Storage path**: `{user_id}/{report_type}/{timestamp}_{filename}` — matches folder-based RLS policy

## Blocked On

The migration must land first — the new columns (`report_type`, `processing_status`, `file_path`, etc.) and the `health-reports` storage bucket don't exist yet. Once Claude confirms the migration is applied, Lovable can implement all 4 steps in sequence.

