

# Plan: Fix Stripe Ticket Purchase Flow

## Issues Found

### 1. CORS headers are incomplete (likely blocking requests entirely)
The `stripe-create-ticket-checkout` edge function has outdated CORS headers missing required Supabase client headers. The current headers:
```
"authorization, x-client-info, apikey, content-type"
```
Should be:
```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```
This is the most likely cause -- the browser's preflight (OPTIONS) request fails silently, blocking the actual POST.

### 2. Popup-based checkout gets blocked by browsers
The `usePurchaseTicket` hook uses `window.open()` to open Stripe checkout in a popup. Since this happens after an `await` (the edge function call), browsers block it as a non-user-initiated popup. Per your project's established pattern, this should use `window.location.href = url` for reliable redirect.

## Changes

### File 1: `supabase/functions/stripe-create-ticket-checkout/index.ts`
- Update CORS `Access-Control-Allow-Headers` to include the full set of Supabase client headers

### File 2: `src/hooks/useEventTickets.ts`
- Replace `window.open()` popup logic (lines 217-234) with `window.location.href = url` redirect

## Scope
- 2 files modified
- Edge function will need redeployment (automatic)
- No database changes

