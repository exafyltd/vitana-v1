

# Create Privacy Policy Page at /privacy

## Overview

Create a new public route at `/privacy` that displays the Maxina Mobile Privacy Policy from the uploaded document. This will be a static legal page accessible without authentication.

---

## Document Content Summary

The uploaded document is a comprehensive Privacy Policy for Maxina Mobile Application with:
- **Effective Date**: 29th March 2025
- **Company**: Exafy LTD, Abu Dhabi, UAE
- **13 Sections** covering:
  1. Introduction (About Us, Scope, Compliance)
  2. Data Collection (Account, Usage, Location, Cookies)
  3. How We Collect Your Data
  4. Purpose and Legal Bases for Processing
  5. How We Share Your Data
  6. International Data Transfers
  7. Data Retention
  8. Data Security
  9. GDPR Rights
  10. Children's Privacy
  11. Third-Party Services
  12. Changes to This Policy
  13. Contact Us

---

## Implementation Plan

### Step 1: Create Privacy Policy Page Component

Create a new file `src/pages/legal/PrivacyPolicy.tsx` with:
- Clean, readable typography for legal documents
- Proper heading hierarchy for sections
- SEO metadata for the page
- Responsive design matching the app's styling
- A "Back" navigation option

**Styling approach**: Use a centered container with prose-like styling for readability, similar to blog/legal document patterns.

### Step 2: Register the Route in App.tsx

Add the `/privacy` route to the public routes section (no authentication required):

```typescript
// Import
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";

// Route (after the Public Routes comment, line ~327)
<Route path="/privacy" element={<PrivacyPolicy />} />
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/legal/PrivacyPolicy.tsx` | Main privacy policy page component |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add import and route for `/privacy` |

---

## Page Design

The privacy policy page will include:

- **Header**: "Privacy Policy for the Maxina Mobile Application" with effective date
- **Navigation**: Back button to return to previous page
- **Content**: All 13 sections formatted with proper headings
- **Footer**: Last updated date and contact information
- **SEO**: Proper meta tags for search engines

**Typography**:
- H1 for main title
- H2 for section numbers (1. Introduction, 2. Data Collection, etc.)
- H3 for subsections (1.1 About Us, 2.1 Account Information, etc.)
- Proper paragraph spacing for readability
- Bulleted lists where applicable

---

## Acceptance Criteria

- [ ] Navigating to `https://vitanaland.com/privacy` displays the privacy policy
- [ ] All 13 sections from the document are displayed correctly
- [ ] Page is readable on both mobile and desktop
- [ ] SEO metadata is properly set
- [ ] Page loads without requiring authentication
- [ ] Footer link in MaxinaPortal works correctly (already points to `/privacy`)

