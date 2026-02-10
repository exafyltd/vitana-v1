

# Welcome Discount for New Maxina Users

## Overview

Give every first-time Maxina registrant a personal 10% discount code for events and meetups, delivered via a branded welcome email sent automatically after signup.

## Why Not the Confirmation Email?

The confirmation email is managed by Supabase Auth's email templates (configured in the Supabase dashboard). These templates support limited variables (like the confirmation link) but cannot include custom per-user data like a unique discount code. So we'll send a **separate branded welcome email** right after account creation.

## Architecture

```text
User signs up on /maxina
        |
        v
auth.users INSERT triggers handle_new_user()
        |
        v
handle_new_user() generates discount code
stores it in new "user_discount_codes" table
        |
        v
DB trigger fires edge function "send-welcome-discount"
(via pg_net HTTP call)
        |
        v
Edge function sends branded Maxina email via Resend
with the 10% discount code
        |
        v
User also sees discount on confirmation page + dashboard
```

## What Changes

### 1. New Table: `user_discount_codes`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| code | text | Unique 8-char alphanumeric code (e.g. "MAXINA-A3K9F2") |
| discount_percent | integer | 10 |
| valid_for | text | "events" (scope limiter) |
| tenant_slug | text | "maxina" |
| expires_at | timestamptz | 90 days from creation |
| used_at | timestamptz | null until redeemed |
| used_on_purchase_id | uuid | null until redeemed |
| created_at | timestamptz | default now() |

RLS: Users can read their own codes only.

### 2. Update `handle_new_user()` Trigger

When `tenant_slug = 'maxina'`, also insert a row into `user_discount_codes` with:
- A generated code like `MAXINA-` + 6 random alphanumeric characters
- `discount_percent = 10`
- `expires_at = now() + interval '90 days'`

### 3. New Edge Function: `send-welcome-discount`

Triggered via `pg_net` HTTP call from a new DB trigger on `user_discount_codes` INSERT. The function:
- Fetches the user's email and name from profiles
- Fetches the discount code details
- Sends a branded Maxina-themed HTML email via Resend containing:
  - The MAXINA logo and pink gradient styling (matching existing brand)
  - Welcome message
  - The personal 10% discount code prominently displayed
  - "Valid for 90 days on all VITANA events and meetups"
  - CTA button linking to events page

**Requires**: `RESEND_API_KEY` secret (check if already configured).

### 4. Apply Discount in Ticket Checkout

Update `stripe-create-ticket-checkout` edge function to:
- Accept an optional `discount_code` parameter
- Validate it against `user_discount_codes` (not expired, not used, matches user)
- Apply 10% discount to the Stripe checkout session via `discounts` parameter (create a Stripe coupon if needed)
- Mark the code as used after successful payment (in the webhook)

### 5. UI: Show Discount Code to User

- **MaxinaConfirmed page**: After email confirmation, show the discount code in a highlighted card
- **Events page**: Show a dismissible banner "You have a 10% discount! Use code MAXINA-XXXXX at checkout"
- **Ticket checkout flow**: Add a "Have a discount code?" input field that auto-applies the discount

### 6. Translation Keys

| Key | English | German |
|-----|---------|--------|
| `discount.welcomeTitle` | Your Welcome Gift | Dein Willkommensgeschenk |
| `discount.welcomeMessage` | Use this code for 10% off your first event | Nutze diesen Code fuer 10% Rabatt auf dein erstes Event |
| `discount.validFor` | Valid for 90 days | 90 Tage gueltig |
| `discount.applyCode` | Apply discount code | Rabattcode einloesen |
| `discount.applied` | Discount applied! | Rabatt angewendet! |
| `discount.expired` | This code has expired | Dieser Code ist abgelaufen |
| `discount.invalid` | Invalid discount code | Ungueltiger Rabattcode |

## Files Changed

| File | Action |
|------|--------|
| SQL migration | Create `user_discount_codes` table + RLS + trigger |
| SQL migration | Update `handle_new_user()` to generate Maxina codes |
| `supabase/functions/send-welcome-discount/index.ts` | New edge function for welcome email |
| `supabase/functions/stripe-create-ticket-checkout/index.ts` | Add discount code validation + Stripe discount |
| `supabase/functions/stripe-webhook/index.ts` | Mark discount code as used on payment success |
| `src/pages/portals/MaxinaConfirmed.tsx` | Show discount code card |
| `src/components/tickets/DiscountCodeInput.tsx` | New component for checkout discount input |
| `src/hooks/useDiscountCode.ts` | New hook to fetch user's active discount |
| `src/i18n/en.json` | Add discount translation keys |
| `src/i18n/de.json` | Add discount translation keys |

## Prerequisites

- Verify that `RESEND_API_KEY` is configured in Edge Function secrets
- Verify that `noreply@vitanaland.com` domain is verified in Resend (already used for voucher emails, so likely ready)
