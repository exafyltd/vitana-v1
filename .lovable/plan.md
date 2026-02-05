
# Maxina Support Page

## Overview

Create a dedicated public support page for Maxina at `/maxina_support` (accessible via `https://vitanaland.com/maxina_support`). This page will provide users with help resources, FAQs, and contact options specifically branded for the Maxina tenant.

---

## What Will Be Built

A standalone, public (no authentication required) support page that includes:

- **Help Categories**: Getting Started, Account & Profile, Events & Community, Technical Issues, Billing & Payments
- **FAQ Section**: Common questions with expandable answers
- **Contact Options**: Email support, WhatsApp (if applicable), and support ticket request
- **Quick Links**: Privacy Policy, Delete Account, Terms of Service
- **Maxina Branding**: Pink accent colors (#FF7BAC), Maxina-specific styling

---

## Page Sections

1. **Header**
   - Back button for navigation
   - "Maxina Support" title
   - Maxina logo/branding

2. **Search Bar** (optional, for future)
   - Quick search through FAQs

3. **Help Categories** (grid cards)
   - Getting Started
   - Account & Profile
   - Events & MeetUps
   - Payments & Billing
   - Technical Help

4. **Frequently Asked Questions** (accordion)
   - 8-10 common questions with expandable answers

5. **Contact Support Section**
   - Email: support@exafy.io
   - Response time information
   - Link to support ticket form (in-app)

6. **Useful Links**
   - Privacy Policy
   - Delete Account
   - Back to Maxina Portal

---

## Files to Create/Modify

```text
src/
├── pages/
│   └── legal/
│       └── MaxinaSupport.tsx      [NEW] - Main support page component
├── i18n/
│   ├── en.json                    [MODIFY] - Add support page translations
│   └── de.json                    [MODIFY] - Add German translations
└── App.tsx                        [MODIFY] - Add /maxina_support route
```

---

## Technical Details

### 1. Create MaxinaSupport.tsx

**Location**: `src/pages/legal/MaxinaSupport.tsx`

**Structure**:
- Public page (no authentication required)
- Follows existing legal page pattern (PrivacyPolicy.tsx, DeleteAccount.tsx)
- Responsive design with Tailwind CSS
- Uses existing UI components: Button, Card, Accordion
- Maxina brand colors applied via CSS variables

**Key Components Used**:
- `<Accordion>` for FAQ section
- `<Card>` for help category cards
- `<Button>` for contact actions
- SEO component for meta tags

### 2. Add Route in App.tsx

Add to the "Public Routes - No Auth Required" section:

```typescript
<Route path="/maxina_support" element={<MaxinaSupport />} />
```

### 3. Translation Keys

Add to both `en.json` and `de.json`:

```json
{
  "support": {
    "maxina": {
      "title": "Maxina Support",
      "subtitle": "How can we help you today?",
      "categories": {
        "gettingStarted": "Getting Started",
        "account": "Account & Profile",
        "events": "Events & MeetUps",
        "payments": "Payments & Billing",
        "technical": "Technical Help"
      },
      "faq": {
        "title": "Frequently Asked Questions",
        // ... FAQ items
      },
      "contact": {
        "title": "Contact Support",
        "email": "Email Us",
        "responseTime": "We typically respond within 24 hours"
      }
    }
  }
}
```

---

## FAQ Content (Initial)

1. How do I create a Maxina account?
2. How do I reset my password?
3. How do I join events and meetups?
4. How do I update my profile information?
5. How can I delete my account?
6. What payment methods are accepted?
7. How do I contact event organizers?
8. Is my personal data secure?

---

## SEO Configuration

```typescript
<SEO 
  title="Maxina Support | Help & FAQ"
  description="Get help with your Maxina account. Find answers to common questions about events, payments, and your wellness journey."
  canonical="https://vitanaland.com/maxina_support"
/>
```

---

## Mobile Considerations

- Fully responsive layout
- Touch-friendly accordion interactions
- Prominent contact buttons for mobile users
- Safe area padding for notched devices

---

## Implementation Order

1. Create `MaxinaSupport.tsx` page component
2. Add translation keys to `en.json` and `de.json`
3. Add route to `App.tsx`
4. Test on desktop and mobile viewports

