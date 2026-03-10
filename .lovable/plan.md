

# Add Terms of Use Page for Maxina

## What
Create a `/terms` page (similar to the existing `/privacy` page) displaying the Maxina Terms of Use content from the uploaded document, and register the route in `App.tsx`.

## Changes

### 1. Create `src/pages/legal/TermsOfUse.tsx`
- Mirror the structure of `PrivacyPolicy.tsx` (back button header, scrollable content, SEO component)
- Render all 14 sections from the uploaded Terms document as styled HTML content
- Include the subscription pricing table (Section 3) as a proper HTML table

### 2. Update `src/App.tsx`
- Import `TermsOfUse` component
- Add `<Route path="/terms" element={<TermsOfUse />} />` next to the existing `/privacy` route (around line 345)

No other files need changes — the `/terms` link in `MaxinaPortal.tsx` already points to `/terms`.

