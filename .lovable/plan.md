

# Remove redundant upload CTA from Medical tab empty state

When there are no reports, the Medical tab shows two upload buttons: the dashed "Upload Blood Test" card at the top AND the "Upload First Report" button inside the empty state. This is redundant.

## Fix — `src/components/health/mobile/MobileHealthMedicalTab.tsx`

**Hide the top dashed upload button when there are no reports.** The empty state card already has a prominent CTA — that's sufficient. When reports exist, the dashed upload button remains useful as a quick-access action.

Wrap the top upload button (lines 75-86) with a condition: only show it when `labReports.length > 0`.

This way:
- **Empty state**: Single clean empty state card with "Upload First Report" CTA — no redundancy
- **Has reports**: Dashed upload button at top + report list below — useful quick action

