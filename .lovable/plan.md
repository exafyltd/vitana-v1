## iOS/Appilix Digital Purchase Restriction — Implemented

### Kill Switch
`isIAPRestricted()` in `src/lib/appilix.ts` — returns `isAppilix()`. Stays active on iOS until a compliant IAP solution is built.

### Files Changed (8)
1. `src/lib/appilix.ts` — Added `isIAPRestricted()` export
2. `src/components/ui/utility-action-button.tsx` — Gift Voucher hidden when restricted
3. `src/components/wallet/mobile/MobileWalletQuickActions.tsx` — Add Funds & Buy Credits buttons filtered out
4. `src/components/wallet/popups/AddFundsPopup.tsx` — Returns null when restricted
5. `src/components/wallet/popups/BuyCreditsPopup.tsx` — Returns null when restricted
6. `src/components/wallet/popups/BuyTokensPopup.tsx` — Returns null when restricted
7. `src/components/liverooms/CreateLiveRoomDialog.tsx` — Paid room option hidden, forced free-only
8. `src/components/liverooms/PurchaseRoomAccessDialog.tsx` — Returns null when restricted

### iOS Purchase Flow Status
| Flow | Status | Reason |
|------|--------|--------|
| Gift Voucher | HIDDEN | Digital good |
| Add Funds | HIDDEN | Digital currency |
| Buy Credits | HIDDEN | Digital currency |
| Buy VTNA Tokens | HIDDEN | Digital currency |
| Paid Live Room creation | HIDDEN (free-only) | Digital access |
| Paid Room access | HIDDEN | Digital access |
| Event Tickets | VISIBLE | Real-world physical events (exempt) |
| Service Bookings | VISIBLE | Real-world services (exempt) |

### Post-Approval
Restrictions remain active on iOS. Re-enabling requires implementing Apple IAP or explicitly changing `isIAPRestricted()`.
