

# Fix Stuck "In Bearbeitung" Tasks in AutopilotPopup

## Problem
When `rec.status === "activated"`, `recToAction` maps it to `"executing"`, which renders a permanent spinner with no way to interact. Users can't complete or re-select these tasks.

## Solution
Two changes:

### 1. `src/components/AutopilotPopup.tsx` — Add "Complete ✓" button for executing/activated tasks

In the `ActionItem` component (lines 125-201), replace the `isProcessing` rendering block. Instead of showing only a spinner + "In Bearbeitung" badge, show a **"Complete ✓" Button** that calls the community gateway completion endpoint.

- Import `communityFetch` from `@/lib/community-gateway`
- Import `toast` from `sonner`
- Add local `completing` state (`useState<string | null>`)
- In `ActionItem`, when `isProcessing`:
  - Left side: show a blue circle icon instead of infinite spinner
  - Right side badge area: replace the "In Bearbeitung…" badge with a `<Button size="sm">` labeled "Complete ✓"
  - On click: POST to `/api/v1/autopilot/recommendations/${action.id}/complete` via `communityFetch`, parse `{ reward }`, show VTN toast, call `fetchRecommendations()`

### 2. `src/hooks/use-autopilot.ts` — No change needed to `recToAction`

Keep `"activated" → "executing"` mapping as-is. The UI fix in the popup handles it. This preserves the visual distinction between new tasks (pending) and in-progress tasks (activated).

