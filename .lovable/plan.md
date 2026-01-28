

# Create Delete Account Page at /delete-account

## Overview

Create a new public route at `/delete-account` that explains how users can request deletion of their Maxina account and associated personal data, in compliance with Google Play's Account Deletion policy.

---

## Implementation Plan

### Step 1: Create Delete Account Page Component

Create a new file `src/pages/legal/DeleteAccount.tsx` following the same pattern as `PrivacyPolicy.tsx`:
- Clean, minimal layout with readable typography
- Sticky header with back navigation
- SEO metadata for the page
- Responsive design matching Maxina branding
- Professional, trustworthy tone

### Step 2: Register the Route in App.tsx

Add the `/delete-account` route to the public routes section (no authentication required).

---

## Page Content Structure

| Section | Content |
|---------|---------|
| **Title** | Delete Your Maxina Account |
| **Intro** | Users of the Maxina mobile application may request deletion of their account and associated personal data at any time. |
| **How to Request** | Contact via email: support@exafy.io with registered email and subject line "Account Deletion Request – Maxina" |
| **What Happens Next** | Identity verification, data deletion, retention for legal/business purposes per Privacy Policy |
| **Processing Time** | Typically within 30 days |
| **Footer Note** | Link to Privacy Policy for more information |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/legal/DeleteAccount.tsx` | Account deletion instructions page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add import and route for `/delete-account` |

---

## Design Details

- **Header**: Sticky header with back button and "Delete Account" title
- **Typography**: Clean prose styling matching PrivacyPolicy.tsx
- **Sections**: Clear H2 headings for each section
- **Email**: Clickable mailto link for support@exafy.io
- **Privacy Link**: Internal link to `/privacy` page
- **Mobile-friendly**: Responsive padding and text sizing

---

## Acceptance Criteria

- [ ] Page accessible at `https://vitanaland.com/delete-account`
- [ ] No authentication required
- [ ] All content sections displayed correctly
- [ ] Email link functional (mailto:support@exafy.io)
- [ ] Privacy Policy link works
- [ ] Page readable on mobile and desktop
- [ ] SEO metadata properly set
- [ ] Matches Maxina branding

